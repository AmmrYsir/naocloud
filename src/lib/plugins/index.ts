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
	PluginComponentDecl,
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
	getPluginComponents,
	getAllPluginComponents,
	getPluginComponentFile,
	getPluginComponentForRoute,
	routePluginApi,
} from "./manager";
