/**
 * GET /api/plugins/widgets?placement=dashboard – Get widget data from enabled plugins.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { getPluginWidgets, getPluginWidgetData } from "../../../lib/plugins";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const placement = url.searchParams.get("placement") || "dashboard";
	const widgets = getPluginWidgets(placement);

	// Fetch data for each widget
	const results = await Promise.all(
		widgets.map(async (w) => ({
			pluginId: w.pluginId,
			key: w.key,
			title: w.title,
			colSpan: w.colSpan || 1,
			data: await getPluginWidgetData(w.pluginId, w.key),
		}))
	);

	return new Response(JSON.stringify(results), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
