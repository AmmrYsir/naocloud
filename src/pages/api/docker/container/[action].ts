/**
 * POST /api/docker/container/[action] – Container lifecycle actions.
 * Supports: start, stop, restart, remove
 */
import type { APIRoute } from "astro";
import { runAsync } from "../../../../lib/exec";
import { getUserFromCookies } from "../../../../lib/auth";
import { logAction, LOG_LEVELS, ERROR_CODES } from "../../../../lib/audit";

export const POST: APIRoute = async ({ cookies, request, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	try {
		const body = await request.json();
		const { id } = body;
		const action = params.action;

		if (!id || !action) {
			return new Response(JSON.stringify({ error: "Missing id or action" }), { status: 400 });
		}

		const allowedActions = ["start", "stop", "restart", "remove"];
		if (!allowedActions.includes(action)) {
			return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
		}

		const sanitized = id.replace(/[^a-zA-Z0-9_\-]/g, "");
		const cmdKey = action === "remove" ? "docker:rm" : `docker:${action}`;

		const result = await runAsync(cmdKey, [sanitized], 30000);

		if (!result.ok) {
			const errorCode = action === "start" ? ERROR_CODES.ERR_CONTAINER_START_FAILED
				: action === "stop" ? ERROR_CODES.ERR_CONTAINER_STOP_FAILED
					: action === "restart" ? ERROR_CODES.ERR_CONTAINER_START_FAILED
						: ERROR_CODES.ERR_CONTAINER_REMOVE_FAILED;

			logAction(
				user.username,
				`CONTAINER_${action.toUpperCase()}`,
				id,
				`Failed: ${result.stderr || result.stdout}`,
				undefined,
				{ level: LOG_LEVELS.ERROR, code: errorCode }
			);

			return new Response(
				JSON.stringify({ ok: false, error: result.stderr || "Action failed", code: errorCode }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		logAction(
			user.username,
			`CONTAINER_${action.toUpperCase()}`,
			id,
			`Container ${action} successful`,
			undefined,
			{ level: LOG_LEVELS.INFO, code: "INF001" }
		);

		return new Response(
			JSON.stringify({ ok: true, message: result.stdout }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch (err) {
		logAction(
			user.username,
			"CONTAINER_ACTION",
			params.action || "unknown",
			`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`,
			undefined,
			{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
		);
		return new Response(JSON.stringify({ error: "Internal server error", code: ERROR_CODES.ERR_INTERNAL }), { status: 500 });
	}
};
