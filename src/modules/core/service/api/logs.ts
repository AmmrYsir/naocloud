/**
 * GET /api/modules/service/logs?name=xxx&lines=100 - Get service logs
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

	const lines = parseInt(url.searchParams.get("lines") || "100", 10);
	const maxLines = Math.min(lines, 1000);

	try {
		const logs = execFileSync(
			"journalctl",
			["-u", name, "-n", maxLines.toString(), "--no-pager", "-q"],
			{
				encoding: "utf-8",
				timeout: 10000,
			}
		);

		return new Response(
			JSON.stringify({
				name,
				logs: logs.split("\n").filter((line) => line.trim()),
				lines: maxLines,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err) {
		console.error("[service] Error getting logs:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to get logs",
				logs: [],
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
