/**
 * service-logs plugin – Entry point.
 *
 * Provides systemd/journalctl log viewing for services.
 */

/** @type {import('../../src/lib/plugins/types').PluginInstance} */
const plugin = {
	activate(ctx) {
		ctx.log.info("Service Logs Viewer activated");
	},

	deactivate(ctx) {
		ctx.log.info("Service Logs Viewer deactivated");
	},

	async getWidgetData(widgetKey, ctx) {
		if (widgetKey !== "recent-logs") return null;

		const serviceList = (ctx.config.defaultServices || "docker,nginx,sshd,cron")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		const summaries = [];

		for (const svc of serviceList.slice(0, 4)) {
			// Check if service exists/is active
			const statusResult = ctx.exec.runSync("systemctl:is-active", [svc]);
			const active = statusResult.stdout?.trim() === "active";

			// Get last 3 log lines for preview
			const logResult = ctx.exec.runSync("journalctl:unit", [svc, "--no-pager", "-n", "3", "--output=short"]);

			summaries.push({
				service: svc,
				active,
				lastLines: logResult.ok ? logResult.stdout.split("\n").filter(Boolean).slice(-3) : [],
				error: logResult.ok ? null : "Unable to read logs",
			});
		}

		return { services: summaries, timestamp: new Date().toISOString() };
	},

	api: {
		/** GET /services — List available systemd services */
		"GET /services": async (_req, ctx) => {
			// Get all loaded services from systemctl
			const result = ctx.exec.runSync("systemctl:list-units", [], 15000);

			const services = [];
			if (result.ok) {
				const lines = result.stdout.split("\n").filter(Boolean);
				for (const line of lines) {
					// Parse systemctl list-units output: UNIT LOAD ACTIVE SUB DESCRIPTION
					const match = line.match(/^\s*(\S+\.service)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)/);
					if (match) {
						services.push({
							unit: match[1],
							name: match[1].replace(".service", ""),
							load: match[2],
							active: match[3],
							sub: match[4],
							description: match[5].trim(),
						});
					}
				}
			}

			// Also include configured default services, marking them as "pinned"
			const defaultList = (ctx.config.defaultServices || "docker,nginx,sshd,cron")
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);

			return new Response(
				JSON.stringify({ services, defaults: defaultList }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		},

		/** GET /entries?service=xxx&lines=100&since=&until=&grep= — Fetch log entries */
		"GET /entries": async (req, ctx) => {
			const url = new URL(req.url);
			const service = url.searchParams.get("service");
			const lines = url.searchParams.get("lines") || String(ctx.config.defaultLines || 100);
			const since = url.searchParams.get("since");
			const until = url.searchParams.get("until");
			const grep = url.searchParams.get("grep");
			const priority = url.searchParams.get("priority"); // 0-7 or emerg,alert,crit,err,warning,notice,info,debug

			if (!service) {
				return new Response(
					JSON.stringify({ error: "Missing 'service' parameter" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			// Validate service name — only allow alphanumeric, hyphens, underscores, dots, @
			if (!/^[a-zA-Z0-9@._\-]+$/.test(service)) {
				return new Response(
					JSON.stringify({ error: "Invalid service name" }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			// Build journalctl arguments
			const extraArgs = [service, "--no-pager", "-n", lines, "--output=json"];

			if (since) {
				// Validate date format
				if (/^\d{4}-\d{2}-\d{2}/.test(since) || /^today|yesterday|now/.test(since) || /^\d+\s*(min|hour|day|week)/.test(since)) {
					extraArgs.push("--since", since);
				}
			}

			if (until) {
				if (/^\d{4}-\d{2}-\d{2}/.test(until) || /^today|yesterday|now/.test(until)) {
					extraArgs.push("--until", until);
				}
			}

			if (priority) {
				if (/^[0-7]$/.test(priority) || /^(emerg|alert|crit|err|warning|notice|info|debug)$/.test(priority)) {
					extraArgs.push("-p", priority);
				}
			}

			if (grep) {
				// Limit grep length for safety
				const safeGrep = grep.slice(0, 200);
				extraArgs.push("--grep", safeGrep);
			}

			const result = ctx.exec.runSync("journalctl:unit", extraArgs, 15000);

			if (!result.ok) {
				return new Response(
					JSON.stringify({ entries: [], error: result.stderr || "Failed to read logs" }),
					{ status: 200, headers: { "Content-Type": "application/json" } }
				);
			}

			// Parse JSON lines output from journalctl
			const entries = result.stdout
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					try {
						const entry = JSON.parse(line);
						return {
							timestamp: entry.__REALTIME_TIMESTAMP
								? new Date(parseInt(entry.__REALTIME_TIMESTAMP) / 1000).toISOString()
								: null,
							priority: entry.PRIORITY || "6",
							unit: entry._SYSTEMD_UNIT || service,
							pid: entry._PID || "",
							message: entry.MESSAGE || "",
							hostname: entry._HOSTNAME || "",
						};
					} catch {
						return null;
					}
				})
				.filter(Boolean);

			return new Response(
				JSON.stringify({ entries, service, total: entries.length }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		},
	},
};

export default plugin;
