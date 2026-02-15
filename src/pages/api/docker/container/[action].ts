/**
 * POST /api/docker/container/[action] – Container lifecycle actions.
 * Supports: start, stop, restart, remove
 */
import type { APIRoute } from "astro";
import { runAsync } from "../../../../lib/exec";
import { getUserFromCookies } from "../../../../lib/auth";

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

		return new Response(
			JSON.stringify({ ok: result.ok, message: result.stdout || result.stderr }),
			{ status: result.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
