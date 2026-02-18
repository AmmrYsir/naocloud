/**
 * POST /api/services/[action] – Start or stop a systemd service.
 * Actions: start, stop, restart
 */
import type { APIRoute } from "astro";
import { runAsync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";
import { logAction, LOG_LEVELS, ERROR_CODES } from "../../../lib/audit";

const ALLOWED_SERVICES = ["nginx", "ssh", "sshd", "ufw", "docker", "apache2", "mysql", "postgresql", "redis"];

export const POST: APIRoute = async ({ cookies, request, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	const action = params.action;
	if (!action || !["start", "stop", "restart"].includes(action)) {
		return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { name } = body;

		if (!name || !ALLOWED_SERVICES.includes(name)) {
			return new Response(JSON.stringify({ error: "Invalid or disallowed service" }), { status: 400 });
		}

		const result = await runAsync(`systemctl:${action}`, [name], 15000);

		if (!result.ok) {
			logAction(
				user.username,
				`SERVICE_${action.toUpperCase()}`,
				name,
				`Failed: ${result.stderr || result.stdout}`,
				undefined,
				{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_SERVICE_ACTION_FAILED }
			);

			return new Response(
				JSON.stringify({ ok: false, error: result.stderr || "Action failed", code: ERROR_CODES.ERR_SERVICE_ACTION_FAILED }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		logAction(
			user.username,
			`SERVICE_${action.toUpperCase()}`,
			name,
			`Service ${action} successful`,
			undefined,
			{ level: LOG_LEVELS.INFO, code: "INF006" }
		);

		return new Response(
			JSON.stringify({ ok: true, message: result.stdout }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch (err) {
		logAction(
			user.username,
			`SERVICE_${action || "ACTION"}`,
			"unknown",
			`Internal error: ${err instanceof Error ? err.message : "Unknown error"}`,
			undefined,
			{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
		);
		return new Response(JSON.stringify({ error: "Internal server error", code: ERROR_CODES.ERR_INTERNAL }), { status: 500 });
	}
};
