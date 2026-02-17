/**
 * POST /api/modules/:moduleId/toggle - Enable or disable a module
 */
import type { APIRoute } from "astro";
import { setModuleEnabled } from "../../../../modules/registry";

export const POST: APIRoute = async ({ params, request }) => {
	const moduleId = params.moduleId;

	if (!moduleId) {
		return new Response(JSON.stringify({ error: "Module ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = await request.json();
		const { enabled } = body;

		const success = setModuleEnabled(moduleId, enabled);

		if (!success) {
			return new Response(JSON.stringify({ error: "Module not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ ok: true, enabled }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[modules] Error toggling module:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
