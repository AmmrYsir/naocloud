/**
 * GET /api/plugins – List all plugins.
 * POST /api/plugins – Enable/disable/configure a plugin.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import {
	getAllPlugins,
	enablePlugin,
	disablePlugin,
	updatePluginConfig,
} from "../../../lib/plugins";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const plugins = getAllPlugins();
	return new Response(JSON.stringify(plugins), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	try {
		const body = await request.json();
		const { id, action, config } = body;

		if (!id) {
			return new Response(JSON.stringify({ error: "Missing plugin id" }), { status: 400 });
		}

		// Validate plugin id format
		if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(id) && !/^[a-z0-9]$/.test(id)) {
			return new Response(JSON.stringify({ error: "Invalid plugin id" }), { status: 400 });
		}

		switch (action) {
			case "enable": {
				const ok = await enablePlugin(id);
				if (!ok) return new Response(JSON.stringify({ error: "Plugin not found" }), { status: 404 });
				return new Response(JSON.stringify({ ok: true, message: `Plugin "${id}" enabled` }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			case "disable": {
				const ok = await disablePlugin(id);
				if (!ok) return new Response(JSON.stringify({ error: "Plugin not found" }), { status: 404 });
				return new Response(JSON.stringify({ ok: true, message: `Plugin "${id}" disabled` }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			case "configure": {
				if (!config || typeof config !== "object") {
					return new Response(JSON.stringify({ error: "Missing config object" }), { status: 400 });
				}
				const ok = updatePluginConfig(id, config);
				if (!ok) return new Response(JSON.stringify({ error: "Plugin not found" }), { status: 404 });
				return new Response(JSON.stringify({ ok: true, message: `Plugin "${id}" configured` }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			default:
				return new Response(JSON.stringify({ error: "Invalid action. Use: enable, disable, configure" }), { status: 400 });
		}
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
