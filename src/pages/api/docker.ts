/**
 * /api/docker/* – Docker management endpoints.
 * Communicates with Docker Engine via CLI (docker commands).
 */
import type { APIRoute } from "astro";
import { runSync, runAsync } from "../../lib/exec";
import { getUserFromCookies } from "../../lib/auth";

function authGuard(cookies: any) {
	const user = getUserFromCookies(cookies);
	if (!user) return null;
	return user;
}

/** GET /api/docker/containers */
export const GET: APIRoute = async ({ cookies, url }) => {
	if (!authGuard(cookies)) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const path = url.searchParams.get("resource") || "containers";

	try {
		let result;
		switch (path) {
			case "containers":
				result = runSync("docker:ps", [], 15000);
				break;
			case "images":
				result = runSync("docker:images", [], 15000);
				break;
			case "volumes":
				result = runSync("docker:volumes", [], 10000);
				break;
			case "networks":
				result = runSync("docker:networks", [], 10000);
				break;
			default:
				return new Response(JSON.stringify({ error: "Unknown resource" }), { status: 400 });
		}

		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.stderr || "Docker command failed" }), { status: 500 });
		}

		// Parse NDJSON lines
		const items = result.stdout
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try { return JSON.parse(line); }
				catch { return null; }
			})
			.filter(Boolean);

		return new Response(JSON.stringify(items), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};

/** POST /api/docker – Container actions (start, stop, restart, remove) */
export const POST: APIRoute = async ({ cookies, request }) => {
	const user = authGuard(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}
	if (user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403 });
	}

	try {
		const body = await request.json();
		const { id, action } = body;

		if (!id || !action) {
			return new Response(JSON.stringify({ error: "Missing id or action" }), { status: 400 });
		}

		const allowedActions = ["start", "stop", "restart", "rm"];
		if (!allowedActions.includes(action)) {
			return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
		}

		// Sanitize container ID (alphanumeric + underscores + hyphens only)
		const sanitized = id.replace(/[^a-zA-Z0-9_\-]/g, "");
		const cmdKey = `docker:${action}`;

		const result = await runAsync(cmdKey, [sanitized], 30000);

		return new Response(
			JSON.stringify({ ok: result.ok, message: result.stdout || result.stderr }),
			{ status: result.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
