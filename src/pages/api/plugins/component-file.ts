/**
 * GET /api/plugins/component-file?plugin=<id>&key=<componentKey>
 *
 * Serves a plugin component's JavaScript file as an ES module.
 * This enables dynamic import() of plugin components on the client side.
 *
 * Security: validates the file path stays within the plugin's directory.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { getPluginComponentFile } from "../../../lib/plugins";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const pluginId = url.searchParams.get("plugin");
	const componentKey = url.searchParams.get("key");

	if (!pluginId || !componentKey) {
		return new Response(JSON.stringify({ error: "Missing 'plugin' and 'key' parameters" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate plugin ID format
	if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(pluginId) && !/^[a-z0-9]$/.test(pluginId)) {
		return new Response(JSON.stringify({ error: "Invalid plugin id" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate component key format (alphanumeric, hyphens, dots)
	if (!/^[a-z0-9][a-z0-9.\-]*[a-z0-9]$/.test(componentKey) && !/^[a-z0-9]$/.test(componentKey)) {
		return new Response(JSON.stringify({ error: "Invalid component key" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const result = getPluginComponentFile(pluginId, componentKey);
	if (!result) {
		return new Response(JSON.stringify({ error: "Component not found or plugin is disabled" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	return new Response(result.content, {
		status: 200,
		headers: {
			"Content-Type": result.contentType,
			"Cache-Control": "no-cache",
			"X-Plugin-Id": pluginId,
			"X-Component-Key": componentKey,
		},
	});
};
