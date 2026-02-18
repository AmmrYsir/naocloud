/**
 * Module loader - discovers and loads modules at build-time.
 * 
 * Core modules are loaded from src/modules/core/
 * External modules from node_modules/serverpilot-module-*
 */

import { registerModule } from "./registry";

/**
 * Load all core modules
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
		registerModule({ ...settingsManifest, id: "settings", type: "core", canDisable: false });
	} catch (err) {
		console.error("[modules] Failed to load settings module:", err);
	}

	// Try to load Docker as core module (optional - may not exist yet)
	try {
		const { default: dockerManifest } = await import("./core/docker/manifest");
		registerModule({ ...dockerManifest, id: "docker", type: "core" });
	} catch {
		// Docker module not found - that's OK
	}

	// Load Service module
	try {
		const { default: serviceManifest } = await import("./core/service/manifest");
		registerModule({ ...serviceManifest, id: "service", type: "core" });
	} catch (err) {
		console.error("[modules] Failed to load service module:", err);
	}

	// Load Security module (RBAC + User Management) - cannot be disabled
	try {
		const { default: securityManifest } = await import("./core/security/manifest");
		registerModule({ ...securityManifest, id: "security", type: "core", canDisable: false });
	} catch (err) {
		console.error("[modules] Failed to load security module:", err);
	}

	// Load Audit module - cannot be disabled
	try {
		const { default: auditManifest } = await import("./core/audit/manifest");
		registerModule({ ...auditManifest, id: "audit", type: "core", canDisable: false });
	} catch (err) {
		console.error("[modules] Failed to load audit module:", err);
	}

	// Load Modules page as a core module - cannot be disabled
	try {
		const { default: modulesManifest } = await import("./core/modules/manifest");
		registerModule({ ...modulesManifest, id: "modules", type: "core", canDisable: false });
	} catch (err) {
		console.error("[modules] Failed to load modules module:", err);
	}
}

/**
 * Load external modules from node_modules
 * External packages should be named: serverpilot-module-*
 * Users install: npm install serverpilot-module-example
 * 
 * Note: External modules are loaded at runtime, not build time
 * This allows adding new modules without rebuilding
 */
async function loadExternalModules(): Promise<void> {
	// External modules are loaded dynamically at runtime
	// The module API will handle requests to external modules
	// This is a placeholder for future enhancement
	console.log("[modules] External module support ready - install serverpilot-module-* packages");
}

/**
 * Initialize all modules - call this at app startup
 */
export async function initModules(): Promise<void> {
	console.log("[modules] Initializing module system...");

	await loadCoreModules();
	await loadExternalModules();

	const { getAllModules } = await import("./registry");
	console.log(`[modules] Loaded ${getAllModules().length} module(s)`);
}

/**
 * Get module system API for use in the application
 */
export { getModule, getAllModules, getEnabledModules, getNavItems, getAllPages, getWidgets, setModuleEnabled } from "./registry";
