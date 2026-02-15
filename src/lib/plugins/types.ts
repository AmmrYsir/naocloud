/**
 * Plugin system types and manifest schema.
 *
 * A plugin is a directory inside `plugins/` with:
 *   manifest.json  – metadata & declarations
 *   index.ts/.js   – entry point exporting a PluginInstance
 *   (optional) widget.tsx/.jsx – React component for dashboard widget
 */

/* ── Manifest (manifest.json) ── */

export interface PluginManifest {
	/** Unique plugin identifier (a-z, 0-9, hyphens). Must match directory name. */
	id: string;
	/** Human-readable plugin name. */
	name: string;
	/** Short description (max ~120 chars). */
	description: string;
	/** Semantic version, e.g. "1.0.0". */
	version: string;
	/** Author name or handle. */
	author?: string;
	/** Plugin icon – SVG string or emoji. */
	icon?: string;
	/** Minimum ServerPilot version required. */
	minAppVersion?: string;

	/** Extension points this plugin contributes to. */
	contributes?: {
		/** Navigation items added to the sidebar. */
		navItems?: PluginNavItem[];
		/** Dashboard widget declarations. */
		widgets?: PluginWidgetDecl[];
		/** API route declarations (relative paths). */
		apiRoutes?: PluginApiRouteDecl[];
		/** Settings panel declaration. */
		settings?: PluginSettingsDecl;
		/** Additional exec commands the plugin needs registered. */
		commands?: PluginCommandDecl[];
	};
}

export interface PluginNavItem {
	/** Label in sidebar. */
	label: string;
	/** Route path (auto-prefixed to /plugins/<id>/). */
	href: string;
	/** SVG icon string. */
	icon?: string;
}

export interface PluginWidgetDecl {
	/** Unique widget key within this plugin. */
	key: string;
	/** Display title. */
	title: string;
	/** Grid column span (1-4, default 1). */
	colSpan?: number;
	/** Where the widget appears: "dashboard" | "system" | "docker". */
	placement?: string;
}

export interface PluginApiRouteDecl {
	/** HTTP method. */
	method: "GET" | "POST" | "PUT" | "DELETE";
	/** Path relative to /api/plugins/<id>/. */
	path: string;
	/** Require auth? Default true. */
	auth?: boolean;
	/** Require admin role? Default false. */
	adminOnly?: boolean;
}

export interface PluginSettingsDecl {
	/** Label for settings section. */
	title: string;
	/** Configuration schema – array of field definitions. */
	fields: PluginSettingsField[];
}

export interface PluginSettingsField {
	key: string;
	label: string;
	type: "text" | "number" | "boolean" | "select";
	default?: any;
	options?: { label: string; value: string }[];
	description?: string;
}

export interface PluginCommandDecl {
	/** Registry key (namespaced, e.g. "myplugin:status"). */
	key: string;
	/** Binary to execute. */
	bin: string;
	/** Fixed arguments. */
	args: string[];
}

/* ── Runtime types ── */

export interface PluginContext {
	/** The plugin's own config (from .registry.json). */
	config: Record<string, any>;
	/** Safe command execution (only registered commands). */
	exec: {
		runSync: (key: string, extraArgs?: string[], timeoutMs?: number) => import("../exec").ExecResult;
		runAsync: (key: string, extraArgs?: string[], timeoutMs?: number) => Promise<import("../exec").ExecResult>;
	};
	/** Key-value storage scoped to this plugin. */
	store: {
		get: (key: string) => any;
		set: (key: string, value: any) => void;
		getAll: () => Record<string, any>;
	};
	/** Logger scoped to plugin name. */
	log: {
		info: (...args: any[]) => void;
		warn: (...args: any[]) => void;
		error: (...args: any[]) => void;
	};
}

export interface PluginApiHandler {
	(req: Request, context: PluginContext): Promise<Response> | Response;
}

export interface PluginInstance {
	/** Called when the plugin is loaded/enabled. */
	activate?: (ctx: PluginContext) => void | Promise<void>;
	/** Called when the plugin is disabled/unloaded. */
	deactivate?: (ctx: PluginContext) => void | Promise<void>;
	/** API route handlers keyed by "METHOD /path". */
	api?: Record<string, PluginApiHandler>;
	/** Returns data for widgets (called server-side). */
	getWidgetData?: (widgetKey: string, ctx: PluginContext) => Promise<any> | any;
}

/* ── Registry entry (persisted in .registry.json) ── */

export interface PluginRegistryEntry {
	id: string;
	enabled: boolean;
	config: Record<string, any>;
	installedAt: string;
	version: string;
}
