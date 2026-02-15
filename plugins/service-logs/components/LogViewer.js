/**
 * LogViewer.js – Full-featured service log viewer (plugin component).
 *
 * Dynamically loaded by PluginComponentLoader. Uses React from
 * window.__SP_REACT__ (injected by the loader) instead of bundling its own.
 *
 * Features: service selector, priority/time filters, grep search,
 * auto-refresh, follow-tail, search highlighting.
 */

const React = window.__SP_REACT__;
const { useState, useEffect, useCallback, useRef, createElement: h } = React;

/* ── Priority labels ── */

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
	return h("span", {
		className: `inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${p.color}`,
	}, p.label);
}

/* ── Helpers ── */

function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearch(text, query) {
	if (!query || !text) return text;
	try {
		const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
		return parts.map((part, i) =>
			part.toLowerCase() === query.toLowerCase()
				? h("mark", { key: i, className: "bg-accent/30 text-white rounded px-0.5" }, part)
				: part
		);
	} catch {
		return text;
	}
}

/* ── Since presets ── */

const SINCE_PRESETS = [
	{ label: "All", value: "" },
	{ label: "1h", value: "1 hour ago" },
	{ label: "6h", value: "6 hours ago" },
	{ label: "24h", value: "1 day ago" },
	{ label: "7d", value: "7 days ago" },
	{ label: "Today", value: "today" },
];

/* ── Main component ── */

export default function LogViewer() {
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
		} catch {
			setError("Failed to fetch logs");
		} finally {
			setLoading(false);
		}
	}, [selectedService, lineCount, searchQuery, priorityFilter, sinceFilter]);

	// Fetch on service/filter change
	useEffect(() => { fetchLogs(); }, [fetchLogs]);

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

	/* ── Render ── */

	return h("div", { className: "space-y-4" },

		/* Controls Bar */
		h("div", { className: "glass-card space-y-3" },

			/* Row 1: Service selector + line count + priority + refresh */
			h("div", { className: "flex flex-wrap items-center gap-3" },

				/* Service selector */
				h("div", { className: "flex-1 min-w-[200px]" },
					h("label", { className: "block text-xs text-gray-500 mb-1" }, "Service"),
					h("select", {
						value: selectedService,
						onChange: (e) => setSelectedService(e.target.value),
						className: "w-full appearance-none rounded-lg bg-white/5 border border-white/10 outline-none px-3 py-2 text-sm text-white focus:border-accent",
					},
						h("option", { value: "" }, "Select a service..."),
						defaults.length > 0 && h("optgroup", { label: "Pinned" },
							...defaults.map((d) => h("option", { key: `pin-${d}`, value: d }, d))
						),
						services.length > 0 && h("optgroup", { label: "All Services" },
							...services.map((s) =>
								h("option", { key: s.name, value: s.name },
									`${s.name} ${s.active === "active" ? "●" : "○"}`
								)
							)
						),
					),
				),

				/* Line count */
				h("div", { className: "min-w-[80px]" },
					h("label", { className: "block text-xs text-gray-500 mb-1" }, "Lines"),
					h("select", {
						value: lineCount,
						onChange: (e) => setLineCount(Number(e.target.value)),
						className: "w-full appearance-none rounded-lg bg-white/5 border border-white/10 outline-none px-3 py-2 text-sm text-white focus:border-accent",
					},
						...[50, 100, 200, 500, 1000].map((n) => h("option", { key: n, value: n }, String(n)))
					),
				),

				/* Priority */
				h("div", { className: "min-w-[80px]" },
					h("label", { className: "block text-xs text-gray-500 mb-1" }, "Priority"),
					h("select", {
						value: priorityFilter,
						onChange: (e) => setPriorityFilter(e.target.value),
						className: "w-full appearance-none rounded-lg bg-white/5 border border-white/10 outline-none px-3 py-2 text-sm text-white focus:border-accent",
					},
						h("option", { value: "" }, "All"),
						...["Emergency", "Alert", "Critical", "Error", "Warning", "Notice", "Info", "Debug"].map((label, i) =>
							h("option", { key: i, value: String(i) }, label)
						)
					),
				),

				/* Refresh button */
				h("div", { className: "flex items-end gap-2" },
					h("button", {
						onClick: fetchLogs,
						disabled: loading || !selectedService,
						className: "flex h-[38px] items-center gap-1.5 rounded-lg bg-accent/20 px-3 text-sm text-accent hover:bg-accent/30 transition disabled:opacity-40",
					},
						h("svg", {
							className: `h-4 w-4 ${loading ? "animate-spin" : ""}`,
							fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2,
						},
							h("path", {
								strokeLinecap: "round", strokeLinejoin: "round",
								d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
							})
						),
						"Refresh"
					),
				),
			),

			/* Row 2: Search + time filter + toggles */
			h("div", { className: "flex flex-wrap items-center gap-3" },

				/* Search input */
				h("div", { className: "flex-1 min-w-[200px]" },
					h("div", { className: "relative" },
						h("svg", {
							className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500",
							fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2,
						},
							h("circle", { cx: 11, cy: 11, r: 8 }),
							h("path", { d: "M21 21l-4.35-4.35" }),
						),
						h("input", {
							type: "text",
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							placeholder: "Search logs (grep)...",
							className: "w-full appearance-none rounded-lg bg-white/5 border border-white/10 outline-none pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent",
							onKeyDown: (e) => e.key === "Enter" && fetchLogs(),
						}),
					),
				),

				/* Since presets */
				h("div", { className: "flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 p-0.5" },
					...SINCE_PRESETS.map((preset) =>
						h("button", {
							key: preset.value,
							onClick: () => setSinceFilter(preset.value),
							className: `rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
								sinceFilter === preset.value
									? "bg-accent/20 text-accent"
									: "text-gray-400 hover:text-white hover:bg-white/5"
							}`,
						}, preset.label)
					),
				),

				/* Auto / Follow toggles */
				h("div", { className: "flex items-center gap-3" },
					h("label", { className: "flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer" },
						h("input", {
							type: "checkbox", checked: autoRefresh,
							onChange: (e) => setAutoRefresh(e.target.checked),
							className: "rounded border-white/20 bg-white/5 text-accent focus:ring-accent",
						}),
						"Auto"
					),
					h("label", { className: "flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer" },
						h("input", {
							type: "checkbox", checked: followTail,
							onChange: (e) => setFollowTail(e.target.checked),
							className: "rounded border-white/20 bg-white/5 text-accent focus:ring-accent",
						}),
						"Follow"
					),
				),
			),
		),

		/* Status bar */
		h("div", { className: "flex items-center justify-between text-xs text-gray-500" },
			h("span", null,
				`${entries.length} entries`,
				selectedService && ` from ${selectedService}`,
				loading && " · Loading...",
			),
			lastUpdate && h("span", null, `Updated ${lastUpdate.toLocaleTimeString()}`),
		),

		/* Error */
		error && h("div", { className: "glass-card border border-amber-500/30 text-sm text-amber-400" },
			`⚠ ${error}`
		),

		/* Log entries */
		!selectedService
			? h("div", { className: "glass-card text-center py-12" },
				h("svg", {
					className: "mx-auto h-12 w-12 text-gray-600 mb-3",
					fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1,
				},
					h("path", { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" }),
					h("path", { d: "M14 2v6h6" }),
					h("path", { d: "M16 13H8m8 4H8m2-8H8" }),
				),
				h("p", { className: "text-gray-400" }, "Select a service to view its logs"),
			)
			: entries.length === 0 && !loading
			? h("div", { className: "glass-card text-center py-12" },
				h("p", { className: "text-gray-400" }, "No log entries found"),
				h("p", { className: "mt-1 text-xs text-gray-600" }, "Try adjusting your filters or time range"),
			)
			: h("div", { className: "glass-card !p-0 overflow-hidden" },
				h("div", { className: "max-h-[600px] overflow-y-auto font-mono text-xs" },
					h("table", { className: "w-full" },
						h("thead", { className: "sticky top-0 z-10 bg-panel border-b border-white/10" },
							h("tr", { className: "text-left text-gray-500" },
								h("th", { className: "px-3 py-2 w-[180px]" }, "Timestamp"),
								h("th", { className: "px-3 py-2 w-[60px]" }, "Level"),
								h("th", { className: "px-3 py-2 w-[60px]" }, "PID"),
								h("th", { className: "px-3 py-2" }, "Message"),
							),
						),
						h("tbody", { className: "divide-y divide-white/5" },
							...entries.map((entry, i) => {
								const pri = String(entry.priority);
								const isError = pri <= "3";
								const isWarn = pri === "4";
								return h("tr", {
									key: i,
									className: `hover:bg-white/5 ${isError ? "bg-red-500/5" : isWarn ? "bg-amber-500/5" : ""}`,
								},
									h("td", { className: "px-3 py-1.5 text-gray-500 whitespace-nowrap" },
										entry.timestamp
											? new Date(entry.timestamp).toLocaleString(undefined, {
												month: "short", day: "2-digit",
												hour: "2-digit", minute: "2-digit", second: "2-digit",
											})
											: "—"
									),
									h("td", { className: "px-3 py-1.5" }, h(PriorityBadge, { priority: pri })),
									h("td", { className: "px-3 py-1.5 text-gray-600" }, entry.pid || "—"),
									h("td", { className: "px-3 py-1.5 text-gray-300 break-all whitespace-pre-wrap" },
										highlightSearch(entry.message, searchQuery)
									),
								);
							})
						),
					),
					h("div", { ref: logEndRef }),
				),
			),
	);
}
