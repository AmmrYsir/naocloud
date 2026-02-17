/**
 * Module registry - tracks all loaded modules in the system.
 */

import type { LoadedModule, ModuleManifest, NavItem, ModulePage, ModuleWidget } from "./types";

const modules = new Map<string, LoadedModule>();

export function registerModule(manifest: ModuleManifest): void {
	const module: LoadedModule = {
		manifest,
		enabled: true,
		loaded: true,
	};

	if (modules.has(manifest.id)) {
		console.warn(`[modules] Module "${manifest.id}" is already registered. Overwriting.`);
	}

	modules.set(manifest.id, module);
	console.log(`[modules] Registered module: ${manifest.name} (${manifest.id}) v${manifest.version}`);
}

export function getModule(id: string): LoadedModule | undefined {
	return modules.get(id);
}

export function getAllModules(): LoadedModule[] {
	return Array.from(modules.values());
}

export function getEnabledModules(): LoadedModule[] {
	return getAllModules().filter((m) => m.enabled);
}

export function getNavItems(): NavItem[] {
	const items: NavItem[] = [];
	for (const module of getEnabledModules()) {
		if (module.manifest.navItems) {
			items.push(...module.manifest.navItems);
		}
	}
	return items;
}

export function getModulePages(moduleId: string): ModulePage[] {
	const module = getModule(moduleId);
	return module?.manifest.pages ?? [];
}

export function getAllPages(): ModulePage[] {
	const pages: ModulePage[] = [];
	for (const module of getEnabledModules()) {
		if (module.manifest.pages) {
			pages.push(...module.manifest.pages);
		}
	}
	return pages;
}

export function getWidgets(placement?: string): ModuleWidget[] {
	const widgets: ModuleWidget[] = [];
	for (const module of getEnabledModules()) {
		if (module.manifest.widgets) {
			const filtered = placement
				? module.manifest.widgets.filter((w) => w.placement === placement)
				: module.manifest.widgets;
			widgets.push(...filtered);
		}
	}
	return widgets;
}

export function getApiRoutes(moduleId: string): ModuleManifest["apiRoutes"] {
	const module = getModule(moduleId);
	return module?.manifest.apiRoutes ?? [];
}

export function getModuleSettings(moduleId: string): ModuleManifest["settings"] {
	const module = getModule(moduleId);
	return module?.manifest.settings;
}
