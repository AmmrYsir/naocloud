/**
 * Module widgets API - GET /api/modules/widgets
 * Returns all widgets from all modules, optionally filtered by placement
 */
import type { APIRoute } from "astro";
import { getWidgets } from "../../../modules/registry";

export const GET: APIRoute = async ({ url }) => {
	const placement = url.searchParams.get("placement") as "dashboard" | "sidebar" | "header" | null;

	const widgets = getWidgets(placement ?? undefined);

	const list = widgets.map((w) => ({
		id: w.id,
		name: w.name,
		component: w.component,
		placement: w.placement,
		props: w.props,
	}));

	return new Response(JSON.stringify({ widgets: list }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
