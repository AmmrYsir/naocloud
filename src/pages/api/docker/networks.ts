/**
 * GET /api/docker/networks – Lists all Docker networks.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	try {
		const result = runSync('docker network ls --format "{{json .}}"', 10000);
		if (!result.ok) {
			return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
		}

		const networks = result.stdout.split("\n").filter(Boolean).map((line) => {
			try {
				const n = JSON.parse(line);
				return { Name: n.Name, Driver: n.Driver, Scope: n.Scope, ID: n.ID };
			} catch { return null; }
		}).filter(Boolean);

		return new Response(JSON.stringify(networks), { status: 200, headers: { "Content-Type": "application/json" } });
	} catch {
		return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
	}
};
