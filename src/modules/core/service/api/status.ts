/**
 * GET /api/modules/service/status?name=xxx - Check service status
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { execFileSync } from "child_process";

const ALLOWED_SERVICES = [
	"nginx",
	"ssh",
	"sshd",
	"ufw",
	"docker",
	"apache2",
	"mysql",
	"mariadb",
	"postgresql",
	"redis",
	"php8.1-fpm",
	"php8.2-fpm",
	"fail2ban",
	"cron",
];

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const name = url.searchParams.get("name");
	if (!name || !ALLOWED_SERVICES.includes(name)) {
		return new Response(JSON.stringify({ error: "Invalid or disallowed service" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// Get detailed status
		const statusResult = execFileSync("systemctl", ["status", name, "--no-pager"], {
			encoding: "utf-8",
			timeout: 5000,
		});

		// Parse status
		const activeMatch = statusResult.match(/Active:\s+(\w+)/);
		const active = activeMatch ? activeMatch[1] : "unknown";

		// Check if enabled
		let enabled = false;
		try {
			execFileSync("systemctl", ["is-enabled", name], { encoding: "utf-8", timeout: 5000 });
			enabled = true;
		} catch {
			enabled = false;
		}

		return new Response(
			JSON.stringify({
				name,
				active: active === "active",
				status: active,
				enabled,
				raw: statusResult,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch {
		return new Response(
			JSON.stringify({
				name,
				active: false,
				status: "inactive",
				enabled: false,
				raw: "",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
