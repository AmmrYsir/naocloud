/**
 * GET /api/plugins/components – List all registered plugin components.
 *
 * Query params:
 *   - type: "page" | "widget" | "panel" (optional filter)
 *   - all: "true" to include components from disabled plugins
 *
 * Returns an array of component declarations with plugin metadata.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { getPluginComponents, getAllPluginComponents } from "../../../lib/plugins";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const typeFilter = url.searchParams.get("type") as "page" | "widget" | "panel" | null;
	const showAll = url.searchParams.get("all") === "true";

	let components;
	if (showAll) {
		// Admin view: show all components including disabled plugins
		const all = getAllPluginComponents();
		components = typeFilter ? all.filter((c) => c.type === typeFilter) : all;
	} else {
		// Regular view: only enabled plugins
		components = getPluginComponents(typeFilter || undefined);
	}

	return new Response(JSON.stringify(components), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
