/**
 * POST /api/modules/:moduleId/toggle - Enable or disable a module
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { logAction, LOG_LEVELS, ERROR_CODES } from "../../../../lib/audit";
import { setModuleEnabled, canDisableModule } from "../../../../modules/registry";

export const POST: APIRoute = async ({ cookies, params, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

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

		// Check if module can be disabled
		if (!enabled && !canDisableModule(moduleId)) {
			logAction(
				user.username,
				"MODULE_TOGGLE",
				moduleId,
				"Attempted to disable protected module",
				undefined,
				{ level: LOG_LEVELS.WARN, code: ERROR_CODES.ERR_MODULE_DISABLE_FAILED }
			);
			return new Response(JSON.stringify({ error: "This module cannot be disabled", code: ERROR_CODES.ERR_MODULE_DISABLE_FAILED }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}

		const success = setModuleEnabled(moduleId, enabled);

		if (!success) {
			logAction(
				user.username,
				"MODULE_TOGGLE",
				moduleId,
				"Module not found",
				undefined,
				{ level: LOG_LEVELS.WARN, code: ERROR_CODES.ERR_MODULE_NOT_FOUND }
			);
			return new Response(JSON.stringify({ error: "Module not found", code: ERROR_CODES.ERR_MODULE_NOT_FOUND }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		logAction(
			user.username,
			"MODULE_TOGGLE",
			moduleId,
			`Module ${enabled ? "enabled" : "disabled"}`,
			undefined,
			{ level: LOG_LEVELS.INFO, code: "INF008" }
		);

		return new Response(JSON.stringify({ ok: true, enabled }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : "Unknown error";
		logAction(
			user.username,
			"MODULE_TOGGLE",
			moduleId || "unknown",
			`Internal error: ${errorMsg}`,
			undefined,
			{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
		);
		console.error("[modules] Error toggling module:", err);
		return new Response(JSON.stringify({ error: "Internal server error", code: ERROR_CODES.ERR_INTERNAL }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
