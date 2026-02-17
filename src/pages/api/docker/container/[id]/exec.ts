/**
 * Container Exec API - POST /api/docker/container/:id/exec
 * Execute commands in a container (for web terminal)
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

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Container ID required" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { command, workingDir } = body;

		if (!command) {
			return new Response(JSON.stringify({ error: "Command required" }), { status: 400 });
		}

		// Execute command in container
		const args = ["exec"];
		
		if (workingDir) {
			args.push("-w", workingDir);
		}
		
		args.push("-i", id, "sh", "-c", command);

		const result = execFileSync("docker", args, {
			encoding: "utf-8",
			timeout: 30000,
		});

		logAction(user.username, "CONTAINER_EXEC", id, `Executed: ${command.substring(0, 50)}`);

		return new Response(
			JSON.stringify({
				ok: true,
				output: result,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error executing command:", err);
		return new Response(
			JSON.stringify({
				error: "Command execution failed",
				message: err.message,
				output: "",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
