/**
 * AuditLogViewer.tsx - Audit log viewer component
 */
import { useState, useEffect } from "react";

interface AuditLog {
	id: string;
	timestamp: string;
	user: string;
	action: string;
	target: string;
	details: string;
	ip?: string;
}

export default function AuditLogViewer() {
	const [logs, setLogs] = useState<AuditLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState({ user: "", action: "" });

	useEffect(() => {
		fetchLogs();
	}, []);

	async function fetchLogs() {
		try {
			const params = new URLSearchParams();
			if (filter.user) params.append("user", filter.user);
			if (filter.action) params.append("action", filter.action);
			params.append("limit", "100");

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
			const res = await fetch(`/api/modules/audit/export?format=${format}`, {
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

	if (loading) {
		return (
			<div className="flex items-center justify-center p-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-4 items-end">
				<div>
					<label className="block text-sm text-gray-400 mb-1">User</label>
					<input
						type="text"
						value={filter.user}
						onChange={(e) => setFilter({ ...filter, user: e.target.value })}
						placeholder="Filter by user..."
						className="bg-surface border border-border-dim rounded-lg px-4 py-2"
					/>
				</div>
				<div>
					<label className="block text-sm text-gray-400 mb-1">Action</label>
					<input
						type="text"
						value={filter.action}
						onChange={(e) => setFilter({ ...filter, action: e.target.value })}
						placeholder="Filter by action..."
						className="bg-surface border border-border-dim rounded-lg px-4 py-2"
					/>
				</div>
				<button
					onClick={fetchLogs}
					className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
				>
					Filter
				</button>
				<div className="flex-1" />
				<button
					onClick={() => exportLogs("json")}
					className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
				>
					Export JSON
				</button>
				<button
					onClick={() => exportLogs("csv")}
					className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
				>
					Export CSV
				</button>
			</div>

			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-surface border-b border-border-dim">
							<tr>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Time</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">User</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Action</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Target</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Details</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-gray-400">IP</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-dim">
							{logs.map((log) => (
								<tr key={log.id} className="hover:bg-surface/50">
									<td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
										{new Date(log.timestamp).toLocaleString()}
									</td>
									<td className="px-4 py-3 text-sm text-white">{log.user}</td>
									<td className="px-4 py-3 text-sm">
										<span
											className={`px-2 py-0.5 rounded text-xs ${
												log.action === "LOGIN"
													? "bg-emerald-500/20 text-emerald-400"
													: log.action === "LOGIN_FAILED"
													? "bg-red-500/20 text-red-400"
													: log.action === "DELETE_USER"
													? "bg-red-500/20 text-red-400"
													: "bg-blue-500/20 text-blue-400"
											}`}
										>
											{log.action}
										</span>
									</td>
									<td className="px-4 py-3 text-sm text-gray-300">{log.target}</td>
									<td className="px-4 py-3 text-sm text-gray-400">{log.details}</td>
									<td className="px-4 py-3 text-sm text-gray-500">{log.ip || "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{logs.length === 0 && (
					<div className="text-center py-8 text-gray-500">No audit logs found</div>
				)}
			</div>
		</div>
	);
}
