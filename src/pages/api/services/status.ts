/**
 * GET /api/services/status?name=xxx – Check if a systemd service is active.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

const ALLOWED_SERVICES = ["nginx", "ssh", "sshd", "ufw", "docker", "apache2", "mysql", "postgresql", "redis"];

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const name = url.searchParams.get("name");
	if (!name || !ALLOWED_SERVICES.includes(name)) {
		return new Response(JSON.stringify({ error: "Invalid or disallowed service" }), { status: 400 });
	}

	const result = runSync("systemctl:is-active", [name]);
	const active = result.stdout?.trim() === "active";

	return new Response(
		JSON.stringify({ service: name, active, status: result.stdout?.trim() || "unknown" }),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
};
