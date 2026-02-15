/**
 * GET /api/settings – Get current settings.
 * POST /api/settings – Update hostname/timezone.
 */
import type { APIRoute } from "astro";
import { runSync, runAsync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

	const hostname = runSync("hostname");
	const timezone = runSync("timedatectl");

	let tz = "UTC";
	if (timezone.ok) {
		const match = timezone.stdout.match(/Time zone:\s*(\S+)/);
		if (match) tz = match[1];
	}

	return new Response(
		JSON.stringify({
			hostname: hostname.stdout || "unknown",
			timezone: tz,
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
};

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	try {
		const body = await request.json();
		const results: string[] = [];

		if (body.hostname) {
			const sanitized = body.hostname.replace(/[^a-zA-Z0-9\-]/g, "");
			const r = await runAsync("hostnamectl:set-hostname", [sanitized]);
			results.push(r.ok ? `Hostname set to ${sanitized}` : `Failed: ${r.stderr}`);
		}

		if (body.timezone) {
			const sanitized = body.timezone.replace(/[^a-zA-Z0-9\/\_\-]/g, "");
			const r = await runAsync("timedatectl:set-timezone", [sanitized]);
			results.push(r.ok ? `Timezone set to ${sanitized}` : `Failed: ${r.stderr}`);
		}

		return new Response(
			JSON.stringify({ ok: true, results }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
