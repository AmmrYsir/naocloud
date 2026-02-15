/**
 * RecentLogsWidget.js – Compact recent logs widget (plugin component).
 *
 * Shows a small summary of recent log entries from configured services.
 * Designed for dashboard widget placement.
 */

const { useState, useEffect, createElement: h } = await import("https://esm.sh/react@18");

export default function RecentLogsWidget() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/plugins/widgets?placement=dashboard", { credentials: "same-origin" })
			.then((r) => r.json())
			.then((widgets) => {
				const logsWidget = widgets.find((w) => w.key === "recent-logs");
				if (logsWidget?.data) {
					setData(logsWidget.data);
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return h("div", { className: "flex items-center justify-center py-4" },
			h("div", { className: "h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" })
		);
	}

	if (!data?.services?.length) {
		return h("div", { className: "text-sm text-gray-500 text-center py-4" }, "No recent logs available");
	}

	return h("div", { className: "space-y-2" },
		...data.services.map((svc) =>
			h("div", { key: svc.service, className: "rounded-lg bg-white/5 p-2.5" },
				h("div", { className: "flex items-center justify-between mb-1" },
					h("span", { className: "text-xs font-medium text-white" }, svc.service),
					h("span", {
						className: `h-2 w-2 rounded-full ${svc.active ? "bg-green-500" : "bg-gray-600"}`,
					})
				),
				svc.lastLines?.length > 0
					? h("div", { className: "space-y-0.5" },
						...svc.lastLines.map((line, i) =>
							h("p", { key: i, className: "text-[10px] text-gray-500 truncate font-mono" }, line)
						)
					)
					: h("p", { className: "text-[10px] text-gray-600" }, svc.error || "No recent entries")
			)
		)
	);
}
