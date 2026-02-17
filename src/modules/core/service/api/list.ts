/**
 * GET /api/modules/service/list - List all systemd services
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
	"postgresql",
	"php8.1-fpm",
	"php8.2-fpm",
	"fail2ban",
	"cron",
];

interface ServiceInfo {
	name: string;
	status: "active" | "inactive" | "failed" | "unknown";
	enabled: boolean;
	description: string;
}

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const services: ServiceInfo[] = [];

		for (const serviceName of ALLOWED_SERVICES) {
			try {
				// Check status
				const statusResult = execFileSync("systemctl", ["is-active", serviceName], {
					encoding: "utf-8",
					timeout: 5000,
				});
				const status = statusResult.trim() as ServiceInfo["status"];

				// Check if enabled
				let enabled = false;
				try {
					execFileSync("systemctl", ["is-enabled", serviceName], {
						encoding: "utf-8",
						timeout: 5000,
					});
					enabled = true;
				} catch {
					enabled = false;
				}

				// Get description
				let description = "";
				try {
					const descResult = execFileSync(
						"systemctl",
						["show", serviceName, "--property=Description", "--value"],
						{ encoding: "utf-8", timeout: 5000 }
					);
					description = descResult.trim();
				} catch {
					description = "";
				}

				services.push({
					name: serviceName,
					status: status === "active" ? "active" : status === "inactive" ? "inactive" : "unknown",
					enabled,
					description,
				});
			} catch {
				// Service not found, skip
			}
		}

		return new Response(JSON.stringify({ services }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[service] Error listing services:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
