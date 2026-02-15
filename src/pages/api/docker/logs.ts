/**
 * GET /api/docker/logs?id=xxx&tail=100 – Fetch container logs.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const id = url.searchParams.get("id");
	const tail = parseInt(url.searchParams.get("tail") || "100");

	if (!id) {
		return new Response(JSON.stringify({ error: "Missing container id" }), { status: 400 });
	}

	const sanitized = id.replace(/[^a-zA-Z0-9_\-\.]/g, "");
	const result = runSync(`docker logs --tail ${Math.min(tail, 500)} ${sanitized}`, 10000);

	return new Response(
		JSON.stringify({ logs: result.stdout || result.stderr || "No logs available" }),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
};
