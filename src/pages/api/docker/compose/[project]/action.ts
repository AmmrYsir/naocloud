/**
 * Docker Compose Action API - POST /api/docker/compose/:project/action
 * Start, stop, restart, or remove a compose project
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { logAction } from "../../../../../lib/audit";
import { execFileSync } from "child_process";

export const POST: APIRoute = async ({ cookies, params, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const project = params.project;
	if (!project) {
		return new Response(JSON.stringify({ error: "Project name required" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { action } = body;

		if (!action || !["up", "down", "restart", "pull"].includes(action)) {
			return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
		}

		let result: string;
		switch (action) {
			case "up":
				result = execFileSync(
					"docker-compose",
					["-p", project, "up", "-d"],
					{ encoding: "utf-8", timeout: 60000 }
				);
				break;
			case "down":
				result = execFileSync(
					"docker-compose",
					["-p", project, "down"],
					{ encoding: "utf-8", timeout: 60000 }
				);
				break;
			case "restart":
				result = execFileSync(
					"docker-compose",
					["-p", project, "restart"],
					{ encoding: "utf-8", timeout: 60000 }
				);
				break;
			case "pull":
				result = execFileSync(
					"docker-compose",
					["-p", project, "pull"],
					{ encoding: "utf-8", timeout: 120000 }
				);
				break;
			default:
				return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
		}

		logAction(user.username, "COMPOSE_ACTION", project, `Action: ${action}`);

		return new Response(
			JSON.stringify({ ok: true, action, project, output: result }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error performing compose action:", err);
		return new Response(
			JSON.stringify({
				error: "Action failed",
				message: err.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
