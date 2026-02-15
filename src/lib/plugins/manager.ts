/**
 * Plugin Manager – Core runtime for the plugin system.
 *
 * Responsibilities:
 *   - Discover plugins from the `plugins/` directory
 *   - Validate manifests
 *   - Load/unload plugin modules
 *   - Manage the enable/disable registry (.registry.json)
 *   - Provide scoped PluginContext to each plugin
 *   - Route API requests to plugin handlers
 *   - Register plugin commands into exec.ts registry
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, renameSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { get as httpsGet } from "node:https";
import { get as httpGet } from "node:http";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import type {
	PluginManifest,
	PluginInstance,
	PluginRegistryEntry,
	PluginContext,
	PluginNavItem,
	PluginWidgetDecl,
	PluginComponentDecl,
} from "./types";
import { runSync, runAsync, registerCommand, unregisterCommand } from "../exec";

/* ── Paths ── */
const PLUGINS_DIR = resolve(process.cwd?.() || ".", "plugins");
const REGISTRY_PATH = join(PLUGINS_DIR, ".registry.json");

/* ── In-memory state ── */

interface LoadedPlugin {
	manifest: PluginManifest;
	instance: PluginInstance | null;
	context: PluginContext;
	registryEntry: PluginRegistryEntry;
}

const loadedPlugins = new Map<string, LoadedPlugin>();
const pluginStores = new Map<string, Record<string, any>>();

/* ── Registry persistence ── */

function ensurePluginsDir(): void {
	if (!existsSync(PLUGINS_DIR)) {
		mkdirSync(PLUGINS_DIR, { recursive: true });
	}
}

function readRegistry(): PluginRegistryEntry[] {
	ensurePluginsDir();
	if (!existsSync(REGISTRY_PATH)) return [];
	try {
		return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
	} catch {
		return [];
	}
}

function writeRegistry(entries: PluginRegistryEntry[]): void {
	ensurePluginsDir();
	writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

function getRegistryEntry(id: string): PluginRegistryEntry | undefined {
	return readRegistry().find((e) => e.id === id);
}

function upsertRegistryEntry(entry: PluginRegistryEntry): void {
	const entries = readRegistry();
	const idx = entries.findIndex((e) => e.id === entry.id);
	if (idx >= 0) entries[idx] = entry;
	else entries.push(entry);
	writeRegistry(entries);
}

/* ── Manifest validation ── */

const ID_PATTERN = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;

function validateManifest(manifest: any, dirName: string): manifest is PluginManifest {
	if (!manifest || typeof manifest !== "object") return false;
	if (!manifest.id || !manifest.name || !manifest.version) return false;
	if (!ID_PATTERN.test(manifest.id)) return false;
	if (manifest.id !== dirName) return false;
	return true;
}

/* ── Context factory ── */

function createPluginContext(manifest: PluginManifest, entry: PluginRegistryEntry): PluginContext {
	const pluginId = manifest.id;

	// Scoped store
	if (!pluginStores.has(pluginId)) {
		pluginStores.set(pluginId, { ...(entry.config || {}) });
	}
	const store = pluginStores.get(pluginId)!;

	return {
		config: entry.config || {},
		exec: {
			runSync: (key, extraArgs?, timeoutMs?) => {
				// Only allow plugin's own commands or global read-only ones
				const allowed = key.startsWith(`${pluginId}:`) || isReadOnlyCommand(key);
				if (!allowed) {
					return { ok: false, stdout: "", stderr: `Plugin "${pluginId}" cannot access command "${key}"`, code: 1 };
				}
				return runSync(key, extraArgs, timeoutMs);
			},
			runAsync: (key, extraArgs?, timeoutMs?) => {
				const allowed = key.startsWith(`${pluginId}:`) || isReadOnlyCommand(key);
				if (!allowed) {
					return Promise.resolve({ ok: false, stdout: "", stderr: `Plugin "${pluginId}" cannot access command "${key}"`, code: 1 });
				}
				return runAsync(key, extraArgs, timeoutMs);
			},
		},
		store: {
			get: (key: string) => store[key],
			set: (key: string, value: any) => {
				store[key] = value;
				// Persist to registry
				const e = getRegistryEntry(pluginId);
				if (e) {
					e.config = { ...e.config, [key]: value };
					upsertRegistryEntry(e);
				}
			},
			getAll: () => ({ ...store }),
		},
		log: {
			info: (...args: any[]) => console.log(`[plugin:${pluginId}]`, ...args),
			warn: (...args: any[]) => console.warn(`[plugin:${pluginId}]`, ...args),
			error: (...args: any[]) => console.error(`[plugin:${pluginId}]`, ...args),
		},
	};
}

// Read-only system commands plugins are allowed to use
const READ_ONLY_KEYS = new Set([
	"cat:proc/stat", "cat:proc/loadavg", "cat:proc/cpuinfo", "cat:proc/uptime",
	"cat:proc/net/dev", "cat:proc/version", "hostname", "uname", "uptime",
	"lscpu", "free", "df", "timedatectl",
	"docker:ps", "docker:images", "docker:volumes", "docker:networks", "docker:logs",
	"systemctl:is-active", "systemctl:status",
	"journalctl:unit", "journalctl:unit-json", "systemctl:list-units",
]);

function isReadOnlyCommand(key: string): boolean {
	return READ_ONLY_KEYS.has(key);
}

/* ── Plugin loading ── */

async function loadPlugin(dirName: string): Promise<LoadedPlugin | null> {
	const pluginDir = join(PLUGINS_DIR, dirName);
	const manifestPath = join(pluginDir, "manifest.json");

	if (!existsSync(manifestPath)) {
		console.warn(`[plugins] Skipping "${dirName}": no manifest.json`);
		return null;
	}

	let manifest: PluginManifest;
	try {
		manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
	} catch {
		console.warn(`[plugins] Skipping "${dirName}": invalid manifest.json`);
		return null;
	}

	if (!validateManifest(manifest, dirName)) {
		console.warn(`[plugins] Skipping "${dirName}": manifest validation failed (id must match directory name, use lowercase a-z/0-9/hyphens)`);
		return null;
	}

	// Ensure registry entry
	let entry = getRegistryEntry(manifest.id);
	if (!entry) {
		entry = {
			id: manifest.id,
			enabled: false,
			config: {},
			installedAt: new Date().toISOString(),
			version: manifest.version,
		};
		upsertRegistryEntry(entry);
	} else {
		// Update version if manifest changed
		if (entry.version !== manifest.version) {
			entry.version = manifest.version;
			upsertRegistryEntry(entry);
		}
	}

	const context = createPluginContext(manifest, entry);

	// Register plugin's custom commands
	if (manifest.contributes?.commands) {
		for (const cmd of manifest.contributes.commands) {
			const namespacedKey = cmd.key.startsWith(`${manifest.id}:`) ? cmd.key : `${manifest.id}:${cmd.key}`;
			registerCommand(namespacedKey, { bin: cmd.bin, args: cmd.args });
		}
	}

	// Load the JS/TS entry point
	let instance: PluginInstance | null = null;
	if (entry.enabled) {
		instance = await loadPluginModule(pluginDir, manifest.id);
		if (instance?.activate) {
			try {
				await instance.activate(context);
			} catch (err) {
				console.error(`[plugins] Error activating "${manifest.id}":`, err);
			}
		}
	}

	const loaded: LoadedPlugin = { manifest, instance, context, registryEntry: entry };
	loadedPlugins.set(manifest.id, loaded);
	return loaded;
}

async function loadPluginModule(pluginDir: string, pluginId: string): Promise<PluginInstance | null> {
	// Try index.js, then index.mjs
	const candidates = ["index.js", "index.mjs"];
	for (const file of candidates) {
		const filePath = join(pluginDir, file);
		if (existsSync(filePath)) {
			try {
				const mod = await import(pathToFileURL(filePath).href);
				return (mod.default || mod) as PluginInstance;
			} catch (err) {
				console.error(`[plugins] Error loading module for "${pluginId}":`, err);
				return null;
			}
		}
	}
	// No entry point is fine – plugin may only contribute static declarations
	return null;
}

/* ── Public API ── */

/** Discover and load all plugins from the plugins/ directory. */
export async function initPlugins(): Promise<void> {
	ensurePluginsDir();
	const dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith("."))
		.map((d) => d.name);

	console.log(`[plugins] Scanning ${PLUGINS_DIR} — found ${dirs.length} plugin(s)`);

	for (const dir of dirs) {
		await loadPlugin(dir);
	}

	const enabled = [...loadedPlugins.values()].filter((p) => p.registryEntry.enabled);
	const componentCount = [...loadedPlugins.values()].reduce(
		(sum, p) => sum + (p.manifest.contributes?.components?.length || 0), 0
	);
	console.log(`[plugins] ${loadedPlugins.size} loaded, ${enabled.length} enabled, ${componentCount} component(s) registered`);
}

/** Get all discovered plugins (both enabled and disabled). */
export function getAllPlugins(): Array<{ manifest: PluginManifest; enabled: boolean; config: Record<string, any> }> {
	return [...loadedPlugins.values()].map((p) => ({
		manifest: p.manifest,
		enabled: p.registryEntry.enabled,
		config: p.registryEntry.config,
	}));
}

/** Get a specific plugin's loaded state. */
export function getPlugin(id: string): LoadedPlugin | undefined {
	return loadedPlugins.get(id);
}

/** Enable a plugin. */
export async function enablePlugin(id: string): Promise<boolean> {
	const loaded = loadedPlugins.get(id);
	if (!loaded) return false;

	loaded.registryEntry.enabled = true;
	upsertRegistryEntry(loaded.registryEntry);

	// Load module if not yet loaded
	if (!loaded.instance) {
		const pluginDir = join(PLUGINS_DIR, id);
		loaded.instance = await loadPluginModule(pluginDir, id);
	}

	// Activate
	if (loaded.instance?.activate) {
		try {
			await loaded.instance.activate(loaded.context);
		} catch (err) {
			console.error(`[plugins] Error activating "${id}":`, err);
		}
	}

	console.log(`[plugins] Enabled "${id}"`);
	return true;
}

/** Disable a plugin. */
export async function disablePlugin(id: string): Promise<boolean> {
	const loaded = loadedPlugins.get(id);
	if (!loaded) return false;

	// Deactivate
	if (loaded.instance?.deactivate) {
		try {
			await loaded.instance.deactivate(loaded.context);
		} catch (err) {
			console.error(`[plugins] Error deactivating "${id}":`, err);
		}
	}

	loaded.registryEntry.enabled = false;
	upsertRegistryEntry(loaded.registryEntry);
	loaded.instance = null;

	// Unregister plugin commands
	if (loaded.manifest.contributes?.commands) {
		for (const cmd of loaded.manifest.contributes.commands) {
			const namespacedKey = cmd.key.startsWith(`${id}:`) ? cmd.key : `${id}:${cmd.key}`;
			unregisterCommand(namespacedKey);
		}
	}

	console.log(`[plugins] Disabled "${id}"`);
	return true;
}

/** Update a plugin's config. */
export function updatePluginConfig(id: string, config: Record<string, any>): boolean {
	const loaded = loadedPlugins.get(id);
	if (!loaded) return false;

	loaded.registryEntry.config = { ...loaded.registryEntry.config, ...config };
	upsertRegistryEntry(loaded.registryEntry);

	// Update the in-memory store
	const store = pluginStores.get(id);
	if (store) Object.assign(store, config);

	// Refresh context config
	loaded.context.config = { ...loaded.registryEntry.config };

	return true;
}

/** Get all nav items contributed by enabled plugins. */
export function getPluginNavItems(): Array<PluginNavItem & { pluginId: string }> {
	const items: Array<PluginNavItem & { pluginId: string }> = [];
	for (const [id, loaded] of loadedPlugins) {
		if (!loaded.registryEntry.enabled) continue;
		for (const nav of loaded.manifest.contributes?.navItems || []) {
			items.push({
				...nav,
				// Use the href as-is — plugin authors define their own paths
				href: nav.href,
				pluginId: id,
			});
		}
	}
	return items;
}

/** Get all widget declarations from enabled plugins. */
export function getPluginWidgets(placement = "dashboard"): Array<PluginWidgetDecl & { pluginId: string }> {
	const widgets: Array<PluginWidgetDecl & { pluginId: string }> = [];
	for (const [id, loaded] of loadedPlugins) {
		if (!loaded.registryEntry.enabled) continue;
		for (const w of loaded.manifest.contributes?.widgets || []) {
			if (!w.placement || w.placement === placement) {
				widgets.push({ ...w, pluginId: id });
			}
		}
	}
	return widgets;
}

/** Get widget data from a plugin. */
export async function getPluginWidgetData(pluginId: string, widgetKey: string): Promise<any> {
	const loaded = loadedPlugins.get(pluginId);
	if (!loaded?.instance?.getWidgetData || !loaded.registryEntry.enabled) return null;
	try {
		return await loaded.instance.getWidgetData(widgetKey, loaded.context);
	} catch (err) {
		console.error(`[plugins] Error getting widget data for "${pluginId}:${widgetKey}":`, err);
		return null;
	}
}

/** Get all component declarations from enabled plugins. Optionally filter by component type. */
export function getPluginComponents(type?: "page" | "widget" | "panel"): Array<PluginComponentDecl & { pluginId: string; pluginName: string; resolved: boolean }> {
	const components: Array<PluginComponentDecl & { pluginId: string; pluginName: string; resolved: boolean }> = [];
	for (const [id, loaded] of loadedPlugins) {
		if (!loaded.registryEntry.enabled) continue;
		for (const comp of loaded.manifest.contributes?.components || []) {
			if (type && comp.type !== type) continue;
			// Check if the component file actually exists on disk
			const filePath = join(PLUGINS_DIR, id, comp.file);
			const resolved = existsSync(filePath);
			components.push({ ...comp, pluginId: id, pluginName: loaded.manifest.name, resolved });
		}
	}
	return components;
}

/** Get all component declarations from ALL plugins (enabled and disabled), for admin UI. */
export function getAllPluginComponents(): Array<PluginComponentDecl & { pluginId: string; pluginName: string; enabled: boolean; resolved: boolean }> {
	const components: Array<PluginComponentDecl & { pluginId: string; pluginName: string; enabled: boolean; resolved: boolean }> = [];
	for (const [id, loaded] of loadedPlugins) {
		for (const comp of loaded.manifest.contributes?.components || []) {
			const filePath = join(PLUGINS_DIR, id, comp.file);
			const resolved = existsSync(filePath);
			components.push({
				...comp,
				pluginId: id,
				pluginName: loaded.manifest.name,
				enabled: loaded.registryEntry.enabled,
				resolved,
			});
		}
	}
	return components;
}

/** Read a plugin component's file content. Returns null if not found or not allowed. */
export function getPluginComponentFile(pluginId: string, componentKey: string): { content: string; contentType: string } | null {
	const loaded = loadedPlugins.get(pluginId);
	if (!loaded?.registryEntry.enabled) return null;

	const comp = loaded.manifest.contributes?.components?.find((c) => c.key === componentKey);
	if (!comp) return null;

	const filePath = join(PLUGINS_DIR, pluginId, comp.file);
	// Security: ensure the resolved path is within the plugin directory
	const pluginDir = join(PLUGINS_DIR, pluginId);
	const resolvedPath = resolve(filePath);
	if (!resolvedPath.startsWith(resolve(pluginDir))) return null;

	if (!existsSync(resolvedPath)) return null;

	try {
		const content = readFileSync(resolvedPath, "utf-8");
		const ext = resolvedPath.split(".").pop()?.toLowerCase();
		const contentType = ext === "mjs" || ext === "js" ? "application/javascript" : "text/plain";
		return { content, contentType };
	} catch {
		return null;
	}
}

/** Get a component declaration for a specific route (for dynamic page rendering). */
export function getPluginComponentForRoute(route: string): (PluginComponentDecl & { pluginId: string; pluginName: string }) | null {
	for (const [id, loaded] of loadedPlugins) {
		if (!loaded.registryEntry.enabled) continue;
		for (const comp of loaded.manifest.contributes?.components || []) {
			if (comp.type === "page" && comp.route === route) {
				return { ...comp, pluginId: id, pluginName: loaded.manifest.name };
			}
		}
	}
	return null;
}

/** Route an API request to a plugin handler. Returns null if no handler found. */
export async function routePluginApi(pluginId: string, method: string, path: string, request: Request): Promise<Response | null> {
	const loaded = loadedPlugins.get(pluginId);
	if (!loaded?.instance?.api || !loaded.registryEntry.enabled) return null;

	const handlerKey = `${method.toUpperCase()} ${path}`;
	const handler = loaded.instance.api[handlerKey] || loaded.instance.api[path];

	if (!handler) return null;

	try {
		return await handler(request, loaded.context);
	} catch (err) {
		console.error(`[plugins] API error in "${pluginId}" for ${handlerKey}:`, err);
		return new Response(JSON.stringify({ error: "Plugin error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/* ── Plugin Marketplace ── */

// Bundled catalog ships with the source code (read-only)
const CATALOG_BUNDLED_PATH = resolve(import.meta.dirname ?? ".", "catalog.json");
// Remote catalog URL for updates (fetched at runtime)
const CATALOG_REMOTE_URL = "https://raw.githubusercontent.com/AmmrYsir/naocloud/main/src/lib/plugins/catalog.json";
// Runtime cache written to plugins/ dir so the source tree stays untouched
const CATALOG_CACHE_PATH = join(PLUGINS_DIR, ".catalog-cache.json");

interface PluginCatalogEntry {
	id: string;
	name: string;
	description: string;
	version: string;
	author: string;
	icon?: string;
	category: string;
	tags: string[];
	repository: string;
	downloadUrl: string;
	homepage?: string;
	license?: string;
	screenshots?: string[];
	installSize?: string;
	downloads?: number;
	rating?: number;
	featured?: boolean;
}

interface PluginCatalog {
	version: string;
	updated: string;
	plugins: PluginCatalogEntry[];
	categories?: Array<{ id: string; label: string; icon?: string }>;
}

/**
 * Read plugin catalog. Priority: remote (if forced) → runtime cache → bundled source copy.
 * Remote fetches are cached to plugins/.catalog-cache.json so the source tree stays clean.
 * @param forceRemote - Force fetch from remote URL instead of using cache
 */
export async function getPluginCatalog(forceRemote = false): Promise<PluginCatalog> {
	// Try runtime cache first (unless forceRemote)
	if (!forceRemote && existsSync(CATALOG_CACHE_PATH)) {
		try {
			const data = readFileSync(CATALOG_CACHE_PATH, "utf-8");
			return JSON.parse(data);
		} catch (err) {
			console.error("[plugins] Failed to read catalog cache:", err);
		}
	}

	// Try fetching from remote
	try {
		const response = await fetch(CATALOG_REMOTE_URL, {
			headers: {
				"User-Agent": "naocloud",
				"Accept": "application/json",
			},
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const catalog = await response.json() as PluginCatalog;
		
		// Cache to plugins/.catalog-cache.json (writable dir)
		try {
			ensurePluginsDir();
			writeFileSync(CATALOG_CACHE_PATH, JSON.stringify(catalog, null, 2), "utf-8");
		} catch {
			// Ignore cache write errors
		}
		
		return catalog;
	} catch (err) {
		console.error("[plugins] Failed to fetch remote catalog:", err);
	}

	// Fallback: runtime cache (may be stale but still valid)
	if (existsSync(CATALOG_CACHE_PATH)) {
		try {
			const data = readFileSync(CATALOG_CACHE_PATH, "utf-8");
			return JSON.parse(data);
		} catch { /* ignore */ }
	}

	// Final fallback: bundled catalog from source tree
	if (existsSync(CATALOG_BUNDLED_PATH)) {
		try {
			const data = readFileSync(CATALOG_BUNDLED_PATH, "utf-8");
			return JSON.parse(data);
		} catch { /* ignore */ }
	}

	// Return empty catalog as last resort
	return { version: "0.0.0", updated: new Date().toISOString(), plugins: [] };
}

/**
 * Check which catalog plugins are already installed.
 */
export function getInstalledPluginIds(): string[] {
	return Array.from(loadedPlugins.keys());
}

/**
 * Download a file from URL to destination path.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
	return new Promise((resolvePromise, rejectPromise) => {
		const file = createWriteStream(destPath);
		const get = url.startsWith("https://") ? httpsGet : httpGet;
		
		get(url, (response) => {
			// Handle redirects
			if (response.statusCode === 301 || response.statusCode === 302) {
				const redirectUrl = response.headers.location;
				if (!redirectUrl) {
					rejectPromise(new Error("Redirect without location"));
					return;
				}
				downloadFile(redirectUrl, destPath).then(resolvePromise).catch(rejectPromise);
				return;
			}
			
			if (response.statusCode !== 200) {
				rejectPromise(new Error(`HTTP ${response.statusCode}`));
				return;
			}
			
			response.pipe(file);
			file.on("finish", () => {
				file.close();
				resolvePromise();
			});
			file.on("error", (err) => {
				file.close();
				rejectPromise(err);
			});
		}).on("error", rejectPromise);
	});
}

/**
 * Extract a ZIP file to destination directory.
 * NOTE: Requires 'adm-zip' package. Install with: npm install adm-zip
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
	try {
		// Dynamic import to avoid hard dependency
		// @ts-ignore - adm-zip types may not be available
		const AdmZip = (await import("adm-zip")).default;
		const zip = new AdmZip(zipPath);
		zip.extractAllTo(destDir, true);
	} catch (err: any) {
		if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.message?.includes("Cannot find module")) {
			throw new Error("ZIP extraction requires 'adm-zip' package. Install with: npm install adm-zip");
		}
		throw err;
	}
}

/**
 * Install a plugin from a download URL.
 * @param pluginId - The plugin ID from the catalog
 * @param downloadUrl - URL to the plugin ZIP file
 * @returns Success status and error message if any
 */
export async function installPlugin(pluginId: string, downloadUrl: string): Promise<{ ok: boolean; error?: string; plugin?: PluginManifest }> {
	console.log(`[plugins] Installing plugin "${pluginId}" from ${downloadUrl}`);
	
	// Check if already installed
	if (loadedPlugins.has(pluginId)) {
		return { ok: false, error: "Plugin already installed" };
	}
	
	const tempDir = join(PLUGINS_DIR, `.temp-${pluginId}-${Date.now()}`);
	const zipPath = join(tempDir, "plugin.zip");
	const pluginDir = join(PLUGINS_DIR, pluginId);
	
	try {
		// Create temp directory
		mkdirSync(tempDir, { recursive: true });
		
		// Download the ZIP
		console.log(`[plugins] Downloading from ${downloadUrl}...`);
		await downloadFile(downloadUrl, zipPath);
		
		// Extract ZIP
		console.log(`[plugins] Extracting...`);
		await extractZip(zipPath, tempDir);
		
		// GitHub ZIP archives have a root folder like "plugin-name-main/"
		// Find the actual plugin folder inside
		const extracted = readdirSync(tempDir).filter(f => f !== "plugin.zip");
		if (extracted.length === 0) {
			throw new Error("Empty archive");
		}
		
		// If there's a single folder, assume that's the plugin root
		let pluginRoot = tempDir;
		if (extracted.length === 1) {
			const potentialRoot = join(tempDir, extracted[0]);
			if (statSync(potentialRoot).isDirectory()) {
				pluginRoot = potentialRoot;
			}
		}
		
		// Validate manifest exists
		const manifestPath = join(pluginRoot, "manifest.json");
		if (!existsSync(manifestPath)) {
			throw new Error("No manifest.json found in plugin archive");
		}
		
		// Read and validate manifest
		const manifestData = readFileSync(manifestPath, "utf-8");
		const manifest = JSON.parse(manifestData);
		
		if (!validateManifest(manifest, pluginId)) {
			throw new Error("Invalid manifest or plugin ID mismatch");
		}
		
		// Check if destination exists (shouldn't, but just in case)
		if (existsSync(pluginDir)) {
			throw new Error("Plugin directory already exists");
		}
		
		// Move plugin to final destination
		console.log(`[plugins] Installing to ${pluginDir}...`);
		renameSync(pluginRoot, pluginDir);
		
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		
		// Add to registry (disabled by default)
		const registryEntry: PluginRegistryEntry = {
			id: pluginId,
			enabled: false,
			config: {},
			installedAt: new Date().toISOString(),
			version: manifest.version,
		};
		upsertRegistryEntry(registryEntry);
		
		// Load the plugin into memory
		await loadPlugin(pluginId);
		
		console.log(`[plugins] Successfully installed "${manifest.name}" v${manifest.version}`);
		
		return { ok: true, plugin: manifest };
		
	} catch (err: any) {
		console.error(`[plugins] Installation failed for "${pluginId}":`, err);
		
		// Clean up on failure
		try {
			if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
			if (existsSync(pluginDir)) rmSync(pluginDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		
		return { ok: false, error: err.message || "Installation failed" };
	}
}

/**
 * Uninstall a plugin (removes from disk and registry).
 */
export async function uninstallPlugin(pluginId: string): Promise<{ ok: boolean; error?: string }> {
	const loaded = loadedPlugins.get(pluginId);
	if (!loaded) {
		return { ok: false, error: "Plugin not found" };
	}
	
	try {
		// Disable first if enabled
		if (loaded.registryEntry.enabled) {
			await disablePlugin(pluginId);
		}
		
		// Remove from loaded plugins map
		loadedPlugins.delete(pluginId);
		pluginStores.delete(pluginId);
		
		// Remove from registry
		const entries = readRegistry().filter((e) => e.id !== pluginId);
		writeRegistry(entries);
		
		// Remove from disk
		const pluginDir = join(PLUGINS_DIR, pluginId);
		if (existsSync(pluginDir)) {
			rmSync(pluginDir, { recursive: true, force: true });
		}
		
		console.log(`[plugins] Uninstalled "${pluginId}"`);
		return { ok: true };
		
	} catch (err: any) {
		console.error(`[plugins] Uninstall failed for "${pluginId}":`, err);
		return { ok: false, error: err.message || "Uninstall failed" };
	}
}
