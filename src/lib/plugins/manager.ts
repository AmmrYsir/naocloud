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

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
	PluginManifest,
	PluginInstance,
	PluginRegistryEntry,
	PluginContext,
	PluginNavItem,
	PluginWidgetDecl,
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
	console.log(`[plugins] ${loadedPlugins.size} loaded, ${enabled.length} enabled`);
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
