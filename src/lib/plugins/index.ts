/**
 * Plugin system – barrel export.
 */
export type {
	PluginManifest,
	PluginInstance,
	PluginContext,
	PluginApiHandler,
	PluginNavItem,
	PluginWidgetDecl,
	PluginSettingsDecl,
	PluginSettingsField,
	PluginCommandDecl,
	PluginRegistryEntry,
	PluginApiRouteDecl,
} from "./types";

export {
	initPlugins,
	getAllPlugins,
	getPlugin,
	enablePlugin,
	disablePlugin,
	updatePluginConfig,
	getPluginNavItems,
	getPluginWidgets,
	getPluginWidgetData,
	routePluginApi,
} from "./manager";
