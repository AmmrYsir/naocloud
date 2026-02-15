/**
 * ALL /api/plugins/[...route] – Route requests to plugin API handlers.
 *
 * URL pattern: /api/plugins/<pluginId>/<path>
 * The first segment after /api/plugins/ is the plugin ID.
 * The rest is passed to the plugin's API handler.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { routePluginApi, getPlugin } from "../../../lib/plugins";

async function handlePluginRoute(method: string, cookies: any, request: Request, params: Record<string, string | undefined>): Promise<Response> {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const routeParts = params.route;
	if (!routeParts) {
		return new Response(JSON.stringify({ error: "Missing plugin route" }), { status: 400 });
	}

	// Split: first segment = plugin ID, rest = path
	const segments = routeParts.split("/");
	const pluginId = segments[0];
	const path = "/" + segments.slice(1).join("/");

	if (!pluginId) {
		return new Response(JSON.stringify({ error: "Missing plugin id" }), { status: 400 });
	}

	// Verify plugin exists and is enabled
	const plugin = getPlugin(pluginId);
	if (!plugin) {
		return new Response(JSON.stringify({ error: "Plugin not found" }), { status: 404 });
	}
	if (!plugin.registryEntry.enabled) {
		return new Response(JSON.stringify({ error: "Plugin is disabled" }), { status: 403 });
	}

	// Check admin requirement from manifest
	const routeDecl = plugin.manifest.contributes?.apiRoutes?.find(
		(r) => r.method === method && r.path === path
	);
	if (routeDecl?.adminOnly && user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
	}

	const response = await routePluginApi(pluginId, method, path, request);
	if (!response) {
		return new Response(JSON.stringify({ error: "Route not found in plugin" }), { status: 404 });
	}

	return response;
}

export const GET: APIRoute = async ({ cookies, request, params }) => {
	return handlePluginRoute("GET", cookies, request, params);
};

export const POST: APIRoute = async ({ cookies, request, params }) => {
	return handlePluginRoute("POST", cookies, request, params);
};

export const PUT: APIRoute = async ({ cookies, request, params }) => {
	return handlePluginRoute("PUT", cookies, request, params);
};

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
	return handlePluginRoute("DELETE", cookies, request, params);
};
