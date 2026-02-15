/**
 * POST /api/settings/import – Import configuration from JSON.
 */
import type { APIRoute } from "astro";
import { runAsync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	try {
		const config = await request.json();
		const results: string[] = [];

		if (config?.server?.hostname) {
			const sanitized = config.server.hostname.replace(/[^a-zA-Z0-9\-]/g, "");
			const r = await runAsync("hostnamectl:set-hostname", [sanitized]);
			results.push(r.ok ? `Hostname set to ${sanitized}` : `Hostname failed: ${r.stderr}`);
		}

		if (config?.server?.timezone) {
			const sanitized = config.server.timezone.replace(/[^a-zA-Z0-9\/\_\-]/g, "");
			const r = await runAsync("timedatectl:set-timezone", [sanitized]);
			results.push(r.ok ? `Timezone set to ${sanitized}` : `Timezone failed: ${r.stderr}`);
		}

		return new Response(
			JSON.stringify({ ok: true, results }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
