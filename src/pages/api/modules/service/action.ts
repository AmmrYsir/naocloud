/**
 * POST /api/modules/service/action - Start/stop/restart a service
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	if (user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
	}

	try {
		const body = await request.json();
		const { name, action } = body;

		if (!name || !ALLOWED_SERVICES.includes(name)) {
			return new Response(JSON.stringify({ error: "Invalid or disallowed service" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!action || !["start", "stop", "restart", "enable", "disable"].includes(action)) {
			return new Response(JSON.stringify({ error: "Invalid action" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		let result;
		if (action === "enable" || action === "disable") {
			result = await execFileAsync("systemctl", [action, name], { timeout: 15000 });
		} else {
			result = await execFileAsync("systemctl", [action, name], { timeout: 15000 });
		}

		return new Response(
			JSON.stringify({
				ok: true,
				name,
				action,
				message: result.stdout || "Success",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err) {
		console.error("[service] Error performing action:", err);
		return new Response(
			JSON.stringify({
				error: "Action failed",
				message: err instanceof Error ? err.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
