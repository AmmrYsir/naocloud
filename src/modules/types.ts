/**
 * Module type definitions for ServerPilot's module system.
 */

export type ModuleType = "core" | "external";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface NavItem {
	id: string;
	label: string;
	href: string;
	icon: string;
	group?: string;
	order?: number;
	requiredPermission?: string;
}

export interface ModulePage {
	route: string;
	component: string;
	title: string;
	description?: string;
	requiredPermission?: string;
}

export interface ModuleWidget {
	id: string;
	name: string;
	component: string;
	placement: "dashboard" | "sidebar" | "header";
	props?: Record<string, unknown>;
	requiredPermission?: string;
}

export interface ModuleApiRoute {
	path: string;
	method: HttpMethod;
	handler: string;
	requiredPermission?: string;
}

export interface SettingField {
	type: "text" | "number" | "boolean" | "select" | "password";
	label: string;
	description?: string;
	default?: unknown;
	options?: { value: string; label: string }[];
	required?: boolean;
}

export interface ModuleSettings {
	schema: Record<string, SettingField>;
}

export interface ModuleSandbox {
	allowedCommands: string[];
	allowedPaths?: string[];
	maxMemory?: number;
	timeout?: number;
}

export interface ModuleHooks {
	onInit?: string;
	onEnable?: string;
	onDisable?: string;
}

export interface ModuleManifest {
	id: string;
	name: string;
	version: string;
	description: string;
	author?: string;
	type: ModuleType;
	canDisable?: boolean; // If false, module cannot be disabled (default: true for external, true for core)

	navItems?: NavItem[];
	pages?: ModulePage[];
	apiRoutes?: ModuleApiRoute[];
	widgets?: ModuleWidget[];
	settings?: ModuleSettings;
	sandbox?: ModuleSandbox;
	hooks?: ModuleHooks;
}

export interface LoadedModule {
	manifest: ModuleManifest;
	enabled: boolean;
	loaded: boolean;
	error?: string;
}

export interface ModuleAPI {
	getModule: (id: string) => LoadedModule | undefined;
	getAllModules: () => LoadedModule[];
	getEnabledModules: () => LoadedModule[];
	getNavItems: () => NavItem[];
	getModulePages: (moduleId: string) => ModulePage[];
	getWidgets: (placement?: string) => ModuleWidget[];
}
