/**
 * AuditLogViewer.tsx - Audit log viewer component
 */
import { useState, useEffect } from "react";

interface AuditLog {
	id: string;
	timestamp: string;
	level: "error" | "warn" | "info";
	code: string;
	user?: string;
	action: string;
	target: string;
	details: string;
	ip?: string;
}

type LogLevel = "all" | "error" | "warn" | "info";

export default function AuditLogViewer() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState({
		user: "",
		action: "",
		level: "all" as LogLevel,
		search: "",
	});

	useEffect(() => {
		fetchLogs();
	}, []);

	async function fetchLogs() {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (filter.user) params.append("user", filter.user);
			if (filter.action) params.append("action", filter.action);
			if (filter.level !== "all") params.append("level", filter.level);
			if (filter.search) params.append("search", filter.search);
			params.append("limit", "200");

			const res = await fetch(`/api/modules/audit/logs?${params}`, {
				credentials: "same-origin",
			});
			const data = await res.json();
			setLogs(data.logs || []);
		} catch (err) {
			console.error("Failed to fetch audit logs:", err);
		} finally {
			setLoading(false);
		}
	}

	async function exportLogs(format: "json" | "csv") {
		try {
			const params = new URLSearchParams();
			if (filter.level !== "all") params.append("level", filter.level);
			params.append("format", format);

			const res = await fetch(`/api/modules/audit/export?${params}`, {
				credentials: "same-origin",
			});
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to export logs:", err);
		}
	}

	const getLevelBadge = (level: string) => {
		switch (level) {
			case "error":
				return "bg-red-500/20 text-red-400 border-red-500/30";
			case "warn":
				return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
			default:
				return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-3 items-end">
				<div className="min-w-[120px]">
					<label className="block text-xs text-gray-500 mb-1">Level</label>
					<select
						value={filter.level}
						onChange={(e) => setFilter({ ...filter, level: e.target.value as LogLevel })}
						className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
					>
						<option value="all">All Levels</option>
						<option value="error">Error</option>
						<option value="warn">Warning</option>
						<option value="info">Info</option>
					</select>
				</div>
				<div className="min-w-[140px]">
					<label className="block text-xs text-gray-500 mb-1">User</label>
					<input
						type="text"
						value={filter.user}
						onChange={(e) => setFilter({ ...filter, user: e.target.value })}
						placeholder="Username..."
						className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
					/>
				</div>
				<div className="min-w-[140px]">
					<label className="block text-xs text-gray-500 mb-1">Action</label>
					<input
						type="text"
						value={filter.action}
						onChange={(e) => setFilter({ ...filter, action: e.target.value })}
						placeholder="Action..."
						className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
					/>
				</div>
				<div className="flex-1 min-w-[200px]">
					<label className="block text-xs text-gray-500 mb-1">Search</label>
					<input
						type="text"
						value={filter.search}
						onChange={(e) => setFilter({ ...filter, search: e.target.value })}
						placeholder="Search logs..."
						className="w-full bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
					/>
				</div>
				<button
					onClick={fetchLogs}
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 text-sm font-medium"
				>
					Apply
				</button>
				<div className="flex-1" />
				<button
					onClick={() => exportLogs("json")}
					className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm"
				>
					JSON
				</button>
				<button
					onClick={() => exportLogs("csv")}
					className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm"
				>
					CSV
				</button>
			</div>

			{/* Log Count */}
			<div className="flex items-center gap-2 text-xs text-gray-500">
				<span>{logs.length} entries</span>
				{filter.level !== "all" && <span className="px-2 py-0.5 rounded bg-accent/20 text-accent">{filter.level}</span>}
			</div>

			{/* Logs Table */}
			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto max-h-[600px] overflow-y-auto">
					<table className="w-full">
						<thead className="bg-surface border-b border-border-dim sticky top-0">
							<tr>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Time</th>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Level</th>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Code</th>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">User</th>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Action</th>
								<th className="text-left px-3 py-2 text-xs font-medium text-gray-400">Details</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-dim">
							{logs.map((log) => (
								<tr key={log.id} className="hover:bg-surface/50">
									<td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
										{new Date(log.timestamp).toLocaleString()}
									</td>
									<td className="px-3 py-2">
										<span className={`px-1.5 py-0.5 rounded text-[10px] border ${getLevelBadge(log.level)}`}>
											{log.level.toUpperCase()}
										</span>
									</td>
									<td className="px-3 py-2 text-xs text-gray-500 font-mono">{log.code}</td>
									<td className="px-3 py-2 text-xs text-white">{log.user || "system"}</td>
									<td className="px-3 py-2 text-xs">
										<span
											className={`px-1.5 py-0.5 rounded text-[10px] ${
												log.action?.includes("LOGIN") && log.level === "error"
													? "bg-red-500/20 text-red-400"
													: log.action === "LOGIN"
														? "bg-emerald-500/20 text-emerald-400"
														: "bg-blue-500/20 text-blue-400"
											}`}
										>
											{log.action}
										</span>
									</td>
									<td className="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title={log.details}>
										{log.details}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{logs.length === 0 && (
					<div className="text-center py-8 text-gray-500 text-sm">No audit logs found</div>
				)}
			</div>
		</div>
	);
}
