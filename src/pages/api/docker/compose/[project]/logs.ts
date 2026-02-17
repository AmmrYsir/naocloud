/**
 * Docker Compose Logs API - GET /api/docker/compose/:project/logs
 * Get logs for a compose project
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { execFileSync } from "child_process";

export const GET: APIRoute = async ({ cookies, params, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const project = params.project;
	if (!project) {
		return new Response(JSON.stringify({ error: "Project name required" }), { status: 400 });
	}

	const lines = parseInt(url.searchParams.get("lines") || "100", 10);
	const service = url.searchParams.get("service");

	try {
		const args = ["compose", "-p", project, "logs", "--no-color", "--tail", lines.toString()];
		
		if (service) {
			args.push(service);
		}

		const logs = execFileSync("docker", args, {
			encoding: "utf-8",
			timeout: 30000,
		});

		return new Response(
			JSON.stringify({
				project,
				service,
				logs: logs.split("\n").filter((line) => line.trim()),
				lines,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error getting compose logs:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to get logs",
				message: err.message,
				logs: [],
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
