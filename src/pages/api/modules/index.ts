/**
 * Module list API - GET /api/modules
 * Lists all available modules
 */
import type { APIRoute } from "astro";
import { getAllModules } from "../../../modules/registry";

export const GET: APIRoute = async () => {
	const modules = getAllModules();

	const list = modules.map((m) => ({
		id: m.manifest.id,
		name: m.manifest.name,
		version: m.manifest.version,
		description: m.manifest.description,
		type: m.manifest.type,
		enabled: m.enabled,
		navItems: m.manifest.navItems?.map((n) => n.id) ?? [],
		apiRoutes: m.manifest.apiRoutes?.map((r) => `${r.method} ${r.path}`) ?? [],
		widgets: m.manifest.widgets?.map((w) => w.id) ?? [],
	}));

	return new Response(JSON.stringify({ modules: list }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
