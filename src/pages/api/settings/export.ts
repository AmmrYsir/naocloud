/**
 * GET /api/settings/export – Export configuration as JSON.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
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

	const config = {
		version: "1.0.0",
		exportedAt: new Date().toISOString(),
		server: {
			hostname: hostname.stdout || "unknown",
			timezone: tz,
		},
		services: ["nginx", "ssh", "ufw", "docker"],
		theme: "dark",
	};

	return new Response(JSON.stringify(config, null, 2), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": 'attachment; filename="serverpilot-config.json"',
		},
	});
};
