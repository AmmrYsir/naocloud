/**
 * ServiceLogs.jsx – Service log viewer (React island).
 * Fetches logs from the service-logs plugin API with filtering and search.
 */
import { useState, useEffect, useRef, useCallback } from "react";

const PRIORITY_LABELS = {
	"0": { label: "EMERG", color: "text-red-500 bg-red-500/10" },
	"1": { label: "ALERT", color: "text-red-500 bg-red-500/10" },
	"2": { label: "CRIT", color: "text-red-400 bg-red-400/10" },
	"3": { label: "ERR", color: "text-red-400 bg-red-400/10" },
	"4": { label: "WARN", color: "text-amber-400 bg-amber-400/10" },
	"5": { label: "NOTICE", color: "text-blue-400 bg-blue-400/10" },
	"6": { label: "INFO", color: "text-gray-400 bg-gray-400/10" },
	"7": { label: "DEBUG", color: "text-gray-500 bg-gray-500/10" },
};

function PriorityBadge({ priority }) {
	const p = PRIORITY_LABELS[priority] || PRIORITY_LABELS["6"];
	return (
		<span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${p.color}`}>
			{p.label}
		</span>
	);
}

export default function ServiceLogs() {
	const [services, setServices] = useState([]);
	const [defaults, setDefaults] = useState([]);
	const [selectedService, setSelectedService] = useState("");
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [lineCount, setLineCount] = useState(100);
	const [searchQuery, setSearchQuery] = useState("");
	const [priorityFilter, setPriorityFilter] = useState("");
	const [sinceFilter, setSinceFilter] = useState("");
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [lastUpdate, setLastUpdate] = useState(null);
	const logEndRef = useRef(null);
	const intervalRef = useRef(null);
	const [followTail, setFollowTail] = useState(true);

	// Fetch available services
	useEffect(() => {
		fetch("/api/plugins/service-logs/services", { credentials: "same-origin" })
			.then((r) => r.json())
			.then((data) => {
				setServices(data.services || []);
				setDefaults(data.defaults || []);
				if (data.defaults?.length > 0 && !selectedService) {
					setSelectedService(data.defaults[0]);
				}
			})
			.catch(() => setError("Failed to load services list"));
	}, []);

	// Fetch log entries
	const fetchLogs = useCallback(async () => {
		if (!selectedService) return;
		setLoading(true);
		try {
			const params = new URLSearchParams({
				service: selectedService,
				lines: String(lineCount),
			});
			if (searchQuery) params.set("grep", searchQuery);
			if (priorityFilter) params.set("priority", priorityFilter);
			if (sinceFilter) params.set("since", sinceFilter);

			const res = await fetch(`/api/plugins/service-logs/entries?${params}`, { credentials: "same-origin" });
			const data = await res.json();
			setEntries(data.entries || []);
			setError(data.error || null);
			setLastUpdate(new Date());
		} catch (err) {
			setError("Failed to fetch logs");
		} finally {
			setLoading(false);
		}
	}, [selectedService, lineCount, searchQuery, priorityFilter, sinceFilter]);

	// Fetch on service/filter change
	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	// Auto-refresh
	useEffect(() => {
		if (autoRefresh) {
			intervalRef.current = setInterval(fetchLogs, 10000);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [autoRefresh, fetchLogs]);

	// Scroll to bottom on new entries
	useEffect(() => {
		if (followTail && logEndRef.current) {
			logEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [entries, followTail]);

	// Build service list: defaults first, then all discovered services
	const serviceOptions = [];
	const seen = new Set();
	for (const d of defaults) {
		serviceOptions.push({ name: d, pinned: true });
		seen.add(d);
	}
	for (const s of services) {
		if (!seen.has(s.name)) {
			serviceOptions.push({ name: s.name, pinned: false, description: s.description, active: s.active });
			seen.add(s.name);
		}
	}

	const sincePresets = [
		{ label: "All", value: "" },
		{ label: "1h", value: "1 hour ago" },
		{ label: "6h", value: "6 hours ago" },
		{ label: "24h", value: "1 day ago" },
		{ label: "7d", value: "7 days ago" },
		{ label: "Today", value: "today" },
	];

	return (
		<div className="space-y-4">
			{/* Controls Bar */}
			<div className="glass-card space-y-3">
				{/* Row 1: Service selector + actions */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex-1 min-w-[200px]">
						<label className="block text-xs text-gray-500 mb-1">Service</label>
						<select
							value={selectedService}
							onChange={(e) => setSelectedService(e.target.value)}
							className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
						>
							<option value="">Select a service...</option>
							{defaults.length > 0 && (
								<optgroup label="Pinned">
									{defaults.map((d) => (
										<option key={`pin-${d}`} value={d}>{d}</option>
									))}
								</optgroup>
							)}
							{services.length > 0 && (
								<optgroup label="All Services">
									{services.map((s) => (
										<option key={s.name} value={s.name}>
											{s.name} {s.active === "active" ? "●" : "○"}
										</option>
									))}
								</optgroup>
							)}
						</select>
					</div>

					<div className="min-w-[80px]">
						<label className="block text-xs text-gray-500 mb-1">Lines</label>
						<select
							value={lineCount}
							onChange={(e) => setLineCount(Number(e.target.value))}
							className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
						>
							<option value={50}>50</option>
							<option value={100}>100</option>
							<option value={200}>200</option>
							<option value={500}>500</option>
							<option value={1000}>1000</option>
						</select>
					</div>

					<div className="min-w-[80px]">
						<label className="block text-xs text-gray-500 mb-1">Priority</label>
						<select
							value={priorityFilter}
							onChange={(e) => setPriorityFilter(e.target.value)}
							className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
						>
							<option value="">All</option>
							<option value="0">Emergency</option>
							<option value="1">Alert</option>
							<option value="2">Critical</option>
							<option value="3">Error</option>
							<option value="4">Warning</option>
							<option value="5">Notice</option>
							<option value="6">Info</option>
							<option value="7">Debug</option>
						</select>
					</div>

					<div className="flex items-end gap-2">
						<button
							onClick={fetchLogs}
							disabled={loading || !selectedService}
							className="flex h-[38px] items-center gap-1.5 rounded-lg bg-accent/20 px-3 text-sm text-accent hover:bg-accent/30 transition disabled:opacity-40"
						>
							<svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							Refresh
						</button>
					</div>
				</div>

				{/* Row 2: Search + time filter + toggles */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex-1 min-w-[200px]">
						<div className="relative">
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
							</svg>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search logs (grep)..."
								className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none"
								onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
							/>
						</div>
					</div>

					<div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5">
						{sincePresets.map((preset) => (
							<button
								key={preset.value}
								onClick={() => setSinceFilter(preset.value)}
								className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${sinceFilter === preset.value
										? "bg-accent/20 text-accent"
										: "text-gray-400 hover:text-white hover:bg-white/5"
									}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					<div className="flex items-center gap-3">
						<label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
							<input
								type="checkbox"
								checked={autoRefresh}
								onChange={(e) => setAutoRefresh(e.target.checked)}
								className="rounded border-white/20 bg-white/5 text-accent focus:ring-accent"
							/>
							Auto
						</label>
						<label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
							<input
								type="checkbox"
								checked={followTail}
								onChange={(e) => setFollowTail(e.target.checked)}
								className="rounded border-white/20 bg-white/5 text-accent focus:ring-accent"
							/>
							Follow
						</label>
					</div>
				</div>
			</div>

			{/* Status bar */}
			<div className="flex items-center justify-between text-xs text-gray-500">
				<span>
					{entries.length} entries
					{selectedService && ` from ${selectedService}`}
					{loading && " · Loading..."}
				</span>
				{lastUpdate && (
					<span>Updated {lastUpdate.toLocaleTimeString()}</span>
				)}
			</div>

			{/* Error */}
			{error && (
				<div className="glass-card border border-amber-500/30 text-sm text-amber-400">
					⚠ {error}
				</div>
			)}

			{/* Log entries */}
			{!selectedService ? (
				<div className="glass-card text-center py-12">
					<svg className="mx-auto h-12 w-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
						<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8m8 4H8m2-8H8" />
					</svg>
					<p className="text-gray-400">Select a service to view its logs</p>
				</div>
			) : entries.length === 0 && !loading ? (
				<div className="glass-card text-center py-12">
					<p className="text-gray-400">No log entries found</p>
					<p className="mt-1 text-xs text-gray-600">Try adjusting your filters or time range</p>
				</div>
			) : (
				<div className="glass-card !p-0 overflow-hidden">
					<div className="max-h-[600px] overflow-y-auto font-mono text-xs">
						<table className="w-full">
							<thead className="sticky top-0 z-10 bg-panel border-b border-white/10">
								<tr className="text-left text-gray-500">
									<th className="px-3 py-2 w-[180px]">Timestamp</th>
									<th className="px-3 py-2 w-[60px]">Level</th>
									<th className="px-3 py-2 w-[60px]">PID</th>
									<th className="px-3 py-2">Message</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{entries.map((entry, i) => {
									const pri = String(entry.priority);
									const isError = pri <= "3";
									const isWarn = pri === "4";
									return (
										<tr
											key={i}
											className={`hover:bg-white/5 ${isError ? "bg-red-500/5" : isWarn ? "bg-amber-500/5" : ""}`}
										>
											<td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
												{entry.timestamp
													? new Date(entry.timestamp).toLocaleString(undefined, {
														month: "short", day: "2-digit",
														hour: "2-digit", minute: "2-digit", second: "2-digit",
													})
													: "—"}
											</td>
											<td className="px-3 py-1.5">
												<PriorityBadge priority={pri} />
											</td>
											<td className="px-3 py-1.5 text-gray-600">{entry.pid || "—"}</td>
											<td className="px-3 py-1.5 text-gray-300 break-all whitespace-pre-wrap">
												{highlightSearch(entry.message, searchQuery)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						<div ref={logEndRef} />
					</div>
				</div>
			)}
		</div>
	);
}

/** Highlight search terms in log message */
function highlightSearch(text, query) {
	if (!query || !text) return text;
	try {
		const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
		return parts.map((part, i) =>
			part.toLowerCase() === query.toLowerCase() ? (
				<mark key={i} className="bg-accent/30 text-white rounded px-0.5">
					{part}
				</mark>
			) : (
				part
			)
		);
	} catch {
		return text;
	}
}

function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
