/**
 * utils.ts – Shared helper utilities.
 */

/** Format bytes to human-readable string. */
export function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format seconds to human-readable uptime. */
export function formatUptime(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h ${m}m`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

/** Percentage with color class. */
export function usageColor(pct: number): string {
	if (pct >= 90) return "text-red-500";
	if (pct >= 70) return "text-yellow-500";
	return "text-emerald-500";
}

/** Percentage bar color. */
export function barColor(pct: number): string {
	if (pct >= 90) return "bg-red-500";
	if (pct >= 70) return "bg-yellow-500";
	return "bg-emerald-500";
}

/** Clamp number between min and max. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Docker state badge color. */
export function containerStateColor(state: string): string {
	switch (state?.toLowerCase()) {
		case "running":
			return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
		case "paused":
			return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
		case "exited":
		case "dead":
			return "bg-red-500/20 text-red-400 border-red-500/30";
		default:
			return "bg-gray-500/20 text-gray-400 border-gray-500/30";
	}
}

/** Truncate string with ellipsis. */
export function truncate(str: string, len: number): string {
	return str.length > len ? str.slice(0, len) + "…" : str;
}

/** Time-ago formatter. */
export function timeAgo(date: Date | string): string {
	const now = Date.now();
	const past = new Date(date).getTime();
	const diff = Math.floor((now - past) / 1000);
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}
