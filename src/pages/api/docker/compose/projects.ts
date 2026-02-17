/**
 * Docker Compose Projects API - GET /api/docker/compose/projects
 * List all Docker Compose projects
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ComposeProject {
	name: string;
	status: string;
	services: string[];
	path: string;
}

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		// Get all running compose projects
		const result = execFileSync(
			"docker",
			["compose", "ls", "--all", "--format", "json"],
			{ encoding: "utf-8", timeout: 30000 }
		);

		const projects: ComposeProject[] = JSON.parse(result);

		// Enhance with service information
		for (const project of projects) {
			try {
				// Get services in this project
				const configResult = execFileSync(
					"docker",
					["compose", "-p", project.name, "config", "--services"],
					{ encoding: "utf-8", timeout: 10000 }
				);
				project.services = configResult.trim().split("\n").filter(Boolean);
			} catch {
				project.services = [];
			}
		}

		return new Response(JSON.stringify({ projects }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err: any) {
		console.error("[docker] Error listing compose projects:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to list compose projects",
				message: err.message,
				projects: [],
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
