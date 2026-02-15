/**
 * POST /api/services/[action] – Start or stop a systemd service.
 * Actions: start, stop, restart
 */
import type { APIRoute } from "astro";
import { runAsync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

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

		return new Response(
			JSON.stringify({ ok: result.ok, message: result.stdout || result.stderr }),
			{ status: result.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
