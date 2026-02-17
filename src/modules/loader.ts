/**
 * Module loader - discovers and loads modules at build-time.
 * 
 * Core modules are loaded from src/modules/core/
 * External modules from node_modules/serverpilot-module-*
 */

import { registerModule } from "./registry";
import type { ModuleManifest } from "./types";

/**
 * Load all core modules - each module imports itself
 */
async function loadCoreModules(): Promise<void> {
	try {
		const { default: systemManifest } = await import("./core/system/manifest");
		registerModule({ ...systemManifest, id: "system", type: "core" });
	} catch (err) {
		console.error("[modules] Failed to load system module:", err);
	}

	try {
		const { default: settingsManifest } = await import("./core/settings/manifest");
		registerModule({ ...settingsManifest, id: "settings", type: "core" });
	} catch (err) {
		console.error("[modules] Failed to load settings module:", err);
	}
}

/**
 * Initialize all modules - call this at app startup
 */
export async function initModules(): Promise<void> {
	console.log("[modules] Initializing module system...");

	await loadCoreModules();

	const { getAllModules } = await import("./registry");
	console.log(`[modules] Loaded ${getAllModules().length} module(s)`);
}

/**
 * Get module system API for use in the application
 */
export { getModule, getAllModules, getEnabledModules, getNavItems, getAllPages, getWidgets } from "./registry";
