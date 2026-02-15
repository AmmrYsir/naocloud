/**
 * /api/plugins/marketplace – Plugin marketplace API
 * 
 * GET: List available plugins from catalog
 * POST: Install a plugin from catalog
 * DELETE: Uninstall a plugin
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { getPluginCatalog, getInstalledPluginIds, installPlugin, uninstallPlugin } from "../../../lib/plugins";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const forceRefresh = url.searchParams.get("refresh") === "true";
		const catalog = await getPluginCatalog(forceRefresh);
		const installed = getInstalledPluginIds();

		// Mark which plugins are already installed
		const pluginsWithStatus = catalog.plugins.map((plugin) => ({
			...plugin,
			installed: installed.includes(plugin.id),
		}));

		return new Response(
			JSON.stringify({
				...catalog,
				plugins: pluginsWithStatus,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[marketplace] GET error:", err);
		return new Response(
			JSON.stringify({ error: err.message || "Failed to load catalog" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = await request.json();
		const { pluginId, downloadUrl } = body;

		if (!pluginId || !downloadUrl) {
			return new Response(
				JSON.stringify({ error: "Missing pluginId or downloadUrl" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Validate plugin ID format (security)
		if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(pluginId)) {
			return new Response(
				JSON.stringify({ error: "Invalid plugin ID format" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Install the plugin
		const result = await installPlugin(pluginId, downloadUrl);

		if (result.ok) {
			return new Response(
				JSON.stringify({
					ok: true,
					message: `Plugin "${result.plugin?.name}" installed successfully`,
					plugin: result.plugin,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		} else {
			return new Response(
				JSON.stringify({ ok: false, error: result.error }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (err: any) {
		console.error("[marketplace] POST error:", err);
		return new Response(
			JSON.stringify({ ok: false, error: err.message || "Installation failed" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const pluginId = url.searchParams.get("id");
		if (!pluginId) {
			return new Response(
				JSON.stringify({ error: "Missing plugin ID" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const result = await uninstallPlugin(pluginId);

		if (result.ok) {
			return new Response(
				JSON.stringify({
					ok: true,
					message: `Plugin "${pluginId}" uninstalled successfully`,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		} else {
			return new Response(
				JSON.stringify({ ok: false, error: result.error }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (err: any) {
		console.error("[marketplace] DELETE error:", err);
		return new Response(
			JSON.stringify({ ok: false, error: err.message || "Uninstall failed" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
