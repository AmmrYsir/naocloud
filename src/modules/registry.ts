/**
 * Module registry - tracks all loaded modules in the system.
 */

import type { UserRole } from "../lib/users";
import type { LoadedModule, ModuleManifest, NavItem, ModulePage, ModuleWidget } from "./types";

const modules = new Map<string, LoadedModule>();
const disabledModules = new Set<string>();

export function registerModule(manifest: ModuleManifest): void {
	const isDisabled = disabledModules.has(manifest.id);
	const module: LoadedModule = {
		manifest,
		enabled: !isDisabled,
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

export function setModuleEnabled(id: string, enabled: boolean): boolean {
	const module = modules.get(id);
	if (!module) return false;

	const canDisable = module.manifest.canDisable !== false;
	if (!enabled && !canDisable) {
		return false;
	}

	if (enabled) {
		disabledModules.delete(id);
	} else {
		disabledModules.add(id);
	}
	module.enabled = enabled;
	return true;
}

export function canDisableModule(id: string): boolean {
	const module = modules.get(id);
	if (!module) return false;
	return module.manifest.canDisable !== false;
}

function hasPermission(role: UserRole | undefined, permission: string | undefined): boolean {
	if (!permission) return true;
	if (!role) return false;

	const permissions: Record<UserRole, string[]> = {
		admin: ["*", "admin"],
		operator: ["docker:read", "docker:write", "service:read", "service:write", "system:read", "settings:read"],
		viewer: ["docker:read", "service:read", "system:read", "settings:read"],
	};

	const userPerms = permissions[role] || [];
	return userPerms.includes("*") || userPerms.includes(permission);
}

export function getNavItems(user?: { role: UserRole }): NavItem[] {
	const items: NavItem[] = [];
	for (const module of getEnabledModules()) {
		if (module.manifest.navItems) {
			for (const item of module.manifest.navItems) {
				if (hasPermission(user?.role, item.requiredPermission)) {
					items.push(item);
				}
			}
		}
	}

	items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
	return items;
}

export function getNavGroups(user?: { role: UserRole }): Record<string, NavItem[]> {
	const items = getNavItems(user);
	const groups: Record<string, NavItem[]> = {};

	for (const item of items) {
		const group = item.group || "";
		if (!groups[group]) {
			groups[group] = [];
		}
		groups[group].push(item);
	}

	return groups;
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
