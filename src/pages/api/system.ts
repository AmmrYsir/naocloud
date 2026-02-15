/**
 * GET /api/system – Returns real-time system stats (CPU, RAM, disk, uptime, network).
 */
import type { APIRoute } from "astro";
import { runSync } from "../../lib/exec";
import { getUserFromCookies } from "../../lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		// CPU usage from /proc/stat (simplified)
		const cpuResult = runSync("cat /proc/stat");
		let cpuPercent = 0;
		if (cpuResult.ok) {
			const lines = cpuResult.stdout.split("\n");
			const cpuLine = lines.find((l) => l.startsWith("cpu "));
			if (cpuLine) {
				const parts = cpuLine.split(/\s+/).slice(1).map(Number);
				const idle = parts[3] + (parts[4] || 0);
				const total = parts.reduce((a, b) => a + b, 0);
				cpuPercent = total > 0 ? ((total - idle) / total) * 100 : 0;
			}
		}

		// Load average
		const loadResult = runSync("cat /proc/loadavg");
		const loadAvg = loadResult.ok ? loadResult.stdout.split(" ").slice(0, 3).join(", ") : "N/A";

		// CPU cores
		const coresResult = runSync("cat /proc/cpuinfo");
		const cores = coresResult.ok
			? (coresResult.stdout.match(/^processor/gm) || []).length
			: 0;

		// Memory from free
		const memResult = runSync("free -b");
		let memTotal = 0, memUsed = 0, memFree = 0;
		if (memResult.ok) {
			const memLine = memResult.stdout.split("\n").find((l) => l.startsWith("Mem:"));
			if (memLine) {
				const parts = memLine.split(/\s+/);
				memTotal = parseInt(parts[1]) || 0;
				memUsed = parseInt(parts[2]) || 0;
				memFree = parseInt(parts[3]) || 0;
			}
		}

		// Disk
		const diskResult = runSync("df -B1 /");
		let diskTotal = 0, diskUsed = 0;
		if (diskResult.ok) {
			const lines = diskResult.stdout.split("\n").slice(1);
			if (lines[0]) {
				const parts = lines[0].split(/\s+/);
				diskTotal = parseInt(parts[1]) || 0;
				diskUsed = parseInt(parts[2]) || 0;
			}
		}

		// Uptime
		const uptimeResult = runSync("cat /proc/uptime");
		let uptimeStr = "N/A";
		if (uptimeResult.ok) {
			const secs = parseFloat(uptimeResult.stdout.split(" ")[0]);
			const d = Math.floor(secs / 86400);
			const h = Math.floor((secs % 86400) / 3600);
			const m = Math.floor((secs % 3600) / 60);
			uptimeStr = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
		}

		// Network I/O
		const netResult = runSync("cat /proc/net/dev");
		let rxBytes = 0, txBytes = 0;
		if (netResult.ok) {
			const lines = netResult.stdout.split("\n").slice(2);
			for (const line of lines) {
				const iface = line.split(":")[0]?.trim();
				if (iface && iface !== "lo") {
					const parts = line.split(":")[1]?.trim().split(/\s+/) || [];
					rxBytes += parseInt(parts[0]) || 0;
					txBytes += parseInt(parts[8]) || 0;
				}
			}
		}

		const formatBytes = (b: number) => {
			if (b === 0) return "0 B";
			const k = 1024;
			const sizes = ["B", "KB", "MB", "GB", "TB"];
			const i = Math.floor(Math.log(b) / Math.log(k));
			return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
		};

		return new Response(
			JSON.stringify({
				cpu: {
					percent: Math.round(cpuPercent * 10) / 10,
					cores,
					loadAvg,
				},
				memory: {
					total: formatBytes(memTotal),
					used: formatBytes(memUsed),
					free: formatBytes(memFree),
					usedPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0,
				},
				disk: {
					total: formatBytes(diskTotal),
					used: formatBytes(diskUsed),
					usedPercent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0,
				},
				uptime: uptimeStr,
				network: {
					rx: formatBytes(rxBytes),
					tx: formatBytes(txBytes),
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch (err: any) {
		return new Response(
			JSON.stringify({
				cpu: { percent: 0, cores: 0, loadAvg: "N/A" },
				memory: { total: "N/A", used: "N/A", free: "N/A", usedPercent: 0 },
				disk: { total: "N/A", used: "N/A", usedPercent: 0 },
				uptime: "N/A",
				network: { rx: "N/A", tx: "N/A" },
				_error: "System commands unavailable (non-Linux environment)",
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	}
};
