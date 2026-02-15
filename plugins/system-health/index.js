/**
 * system-health plugin – Entry point.
 *
 * Provides health checks by reading system stats via the sandboxed exec API.
 */

/** @type {import('../../src/lib/plugins/types').PluginInstance} */
const plugin = {
	activate(ctx) {
		ctx.log.info("System Health Monitor activated");
	},

	deactivate(ctx) {
		ctx.log.info("System Health Monitor deactivated");
	},

	async getWidgetData(widgetKey, ctx) {
		if (widgetKey !== "health-summary") return null;

		const checks = [];

		// Disk usage check
		const diskThreshold = ctx.config.diskThreshold || 85;
		const diskResult = ctx.exec.runSync("df");
		if (diskResult.ok) {
			const lines = diskResult.stdout.split("\n").slice(1);
			if (lines[0]) {
				const parts = lines[0].split(/\s+/);
				const total = parseInt(parts[1]) || 1;
				const used = parseInt(parts[2]) || 0;
				const pct = Math.round((used / total) * 100);
				checks.push({
					name: "Disk Usage",
					value: `${pct}%`,
					status: pct >= diskThreshold ? "warning" : "ok",
					detail: pct >= diskThreshold ? `Exceeds ${diskThreshold}% threshold` : "Within limits",
				});
			}
		} else {
			checks.push({ name: "Disk Usage", value: "N/A", status: "error", detail: "Unable to read" });
		}

		// Memory usage check
		const memThreshold = ctx.config.memThreshold || 90;
		const memResult = ctx.exec.runSync("free");
		if (memResult.ok) {
			const memLine = memResult.stdout.split("\n").find((l) => l.startsWith("Mem:"));
			if (memLine) {
				const parts = memLine.split(/\s+/);
				const total = parseInt(parts[1]) || 1;
				const used = parseInt(parts[2]) || 0;
				const pct = Math.round((used / total) * 100);
				checks.push({
					name: "Memory Usage",
					value: `${pct}%`,
					status: pct >= memThreshold ? "warning" : "ok",
					detail: pct >= memThreshold ? `Exceeds ${memThreshold}% threshold` : "Within limits",
				});
			}
		} else {
			checks.push({ name: "Memory Usage", value: "N/A", status: "error", detail: "Unable to read" });
		}

		// Service health checks
		const serviceList = (ctx.config.checkServices || "docker,nginx,ssh")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		for (const svc of serviceList) {
			const result = ctx.exec.runSync("systemctl:is-active", [svc]);
			const active = result.stdout?.trim() === "active";
			checks.push({
				name: svc,
				value: active ? "Running" : "Stopped",
				status: active ? "ok" : "warning",
				detail: result.stdout?.trim() || "unknown",
			});
		}

		return { checks, timestamp: new Date().toISOString() };
	},

	api: {
		"GET /status": async (_req, ctx) => {
			const data = await plugin.getWidgetData("health-summary", ctx);
			return new Response(JSON.stringify(data), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		},
	},
};

export default plugin;
