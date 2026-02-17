/**
 * Module settings API - GET /api/modules/settings
 * Returns settings schemas from all modules
 */
import type { APIRoute } from "astro";
import { getAllModules } from "../../../modules/registry";

export const GET: APIRoute = async () => {
	const modules = getAllModules();

	const settings: Record<string, unknown> = {};

	for (const mod of modules) {
		if (mod.manifest.settings?.schema) {
			settings[mod.manifest.id] = {
				name: mod.manifest.name,
				schema: mod.manifest.settings.schema,
			};
		}
	}

	return new Response(JSON.stringify({ settings }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
