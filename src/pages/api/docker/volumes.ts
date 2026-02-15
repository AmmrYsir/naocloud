/**
 * GET /api/docker/volumes – Lists all Docker volumes.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	try {
		const result = runSync("docker:volumes", [], 10000);
		if (!result.ok) {
			return new Response(JSON.stringify({ Volumes: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
		}

		const volumes = result.stdout.split("\n").filter(Boolean).map((line) => {
			try {
				const v = JSON.parse(line);
				return { Name: v.Name, Driver: v.Driver, Mountpoint: v.Mountpoint || "N/A" };
			} catch { return null; }
		}).filter(Boolean);

		return new Response(JSON.stringify({ Volumes: volumes }), { status: 200, headers: { "Content-Type": "application/json" } });
	} catch {
		return new Response(JSON.stringify({ Volumes: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
	}
};
