/**
 * GET/POST /api/modules/service/config?name=xxx - Get or update service config
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { readFileSync, writeFileSync, existsSync } from "fs";

const SERVICE_CONFIGS: Record<string, string[]> = {
	nginx: ["/etc/nginx/nginx.conf", "/etc/nginx/sites-available/default"],
	ssh: ["/etc/ssh/sshd_config"],
	sshd: ["/etc/ssh/sshd_config"],
	ufw: ["/etc/ufw/ufw.conf"],
	mysql: ["/etc/mysql/my.cnf", "/etc/my.cnf"],
	mariadb: ["/etc/mysql/mariadb.conf.d/50-server.cnf"],
	postgresql: ["/etc/postgresql/*/main/postgresql.conf"],
	redis: ["/etc/redis/redis.conf"],
	fail2ban: ["/etc/fail2ban/jail.local", "/etc/fail2ban/jail.conf"],
};

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const name = url.searchParams.get("name");
	if (!name || !SERVICE_CONFIGS[name]) {
		return new Response(JSON.stringify({ error: "Invalid service or no config available" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const configPaths = SERVICE_CONFIGS[name];
		const configs: { path: string; content: string; exists: boolean }[] = [];

		for (const configPath of configPaths) {
			if (existsSync(configPath)) {
				const content = readFileSync(configPath, "utf-8");
				configs.push({ path: configPath, content, exists: true });
			} else {
				configs.push({ path: configPath, content: "", exists: false });
			}
		}

		return new Response(
			JSON.stringify({
				name,
				configs,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err) {
		console.error("[service] Error reading config:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to read config",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

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
		const { name, path, content } = body;

		if (!name || !SERVICE_CONFIGS[name]) {
			return new Response(JSON.stringify({ error: "Invalid service" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!path || !SERVICE_CONFIGS[name].includes(path)) {
			return new Response(JSON.stringify({ error: "Invalid config path" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Backup existing config
		if (existsSync(path)) {
			const backupPath = `${path}.backup.${Date.now()}`;
			writeFileSync(backupPath, readFileSync(path));
		}

		// Write new config
		writeFileSync(path, content);

		return new Response(
			JSON.stringify({
				ok: true,
				name,
				path,
				message: "Configuration updated successfully",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err) {
		console.error("[service] Error writing config:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to write config",
				message: err instanceof Error ? err.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
