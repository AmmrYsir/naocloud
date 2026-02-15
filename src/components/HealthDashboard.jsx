/**
 * HealthDashboard.jsx – System health monitoring panel (React island).
 * Fetches health data from the system-health plugin API and renders status cards.
 */
import { useState, useEffect, useRef } from "react";

const STATUS_COLORS = {
	ok: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
	warning: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
	error: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

function StatusDot({ status }) {
	const color = STATUS_COLORS[status] || STATUS_COLORS.error;
	return (
		<span className="relative flex h-2.5 w-2.5">
			{status === "warning" || status === "error" ? (
				<span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color.dot} opacity-75`} />
			) : null}
			<span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color.dot}`} />
		</span>
	);
}

function HealthCard({ check }) {
	const color = STATUS_COLORS[check.status] || STATUS_COLORS.error;
	return (
		<div className={`glass-card flex items-center justify-between`}>
			<div className="flex items-center gap-3">
				<StatusDot status={check.status} />
				<div>
					<p className="text-sm font-medium">{check.name}</p>
					<p className="text-xs text-gray-500">{check.detail}</p>
				</div>
			</div>
			<div className={`text-right`}>
				<span className={`text-lg font-bold ${color.text}`}>{check.value}</span>
			</div>
		</div>
	);
}

export default function HealthDashboard() {
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [lastUpdate, setLastUpdate] = useState(null);
	const intervalRef = useRef(null);

	const fetchHealth = async () => {
		try {
			const res = await fetch("/api/plugins/system-health/status", { credentials: "same-origin" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			setData(json);
			setError(null);
			setLastUpdate(new Date());
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchHealth();
		intervalRef.current = setInterval(fetchHealth, 10000); // refresh every 10s
		return () => clearInterval(intervalRef.current);
	}, []);

	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="glass-card animate-pulse">
						<div className="h-4 w-24 rounded bg-white/10 mb-2" />
						<div className="h-6 w-16 rounded bg-white/10" />
					</div>
				))}
			</div>
		);
	}

	if (error && !data) {
		return (
			<div className="glass-card text-center">
				<p className="text-sm text-red-400">Unable to fetch health data</p>
				<p className="mt-1 text-xs text-gray-500">
					Make sure the System Health plugin is enabled and the server is running.
				</p>
				<button
					onClick={fetchHealth}
					className="mt-3 text-xs text-accent hover:underline"
				>
					Retry
				</button>
			</div>
		);
	}

	const checks = data?.checks || [];
	const resourceChecks = checks.filter((c) => c.name === "Disk Usage" || c.name === "Memory Usage");
	const serviceChecks = checks.filter((c) => c.name !== "Disk Usage" && c.name !== "Memory Usage");
	const overallOk = checks.every((c) => c.status === "ok");
	const warningCount = checks.filter((c) => c.status === "warning").length;
	const errorCount = checks.filter((c) => c.status === "error").length;

	return (
		<div className="space-y-6">
			{/* Overall Status Banner */}
			<div className={`glass-card flex items-center gap-4 border ${overallOk ? "border-emerald-500/30" : warningCount > 0 ? "border-amber-500/30" : "border-red-500/30"}`}>
				<div className={`flex h-12 w-12 items-center justify-center rounded-xl ${overallOk ? "bg-emerald-500/10" : warningCount > 0 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
					{overallOk ? (
						<svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					) : (
						<svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					)}
				</div>
				<div className="flex-1">
					<p className={`text-lg font-bold ${overallOk ? "text-emerald-400" : "text-amber-400"}`}>
						{overallOk ? "All Systems Healthy" : `${warningCount + errorCount} Issue${warningCount + errorCount > 1 ? "s" : ""} Detected`}
					</p>
					<p className="text-xs text-gray-500">
						{checks.length} check{checks.length !== 1 ? "s" : ""} monitored
						{lastUpdate && ` · Updated ${lastUpdate.toLocaleTimeString()}`}
					</p>
				</div>
				<button
					onClick={fetchHealth}
					className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
					title="Refresh"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>

			{/* Resource Usage */}
			{resourceChecks.length > 0 && (
				<div>
					<h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">Resource Usage</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{resourceChecks.map((check) => {
							const pct = parseInt(check.value) || 0;
							const color = STATUS_COLORS[check.status] || STATUS_COLORS.ok;
							return (
								<div key={check.name} className="glass-card">
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2">
											<StatusDot status={check.status} />
											<span className="text-sm font-medium">{check.name}</span>
										</div>
										<span className={`text-lg font-bold ${color.text}`}>{check.value}</span>
									</div>
									<div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
										<div
											className={`h-full rounded-full transition-all duration-500 ${check.status === "ok" ? "bg-emerald-500" : check.status === "warning" ? "bg-amber-500" : "bg-red-500"}`}
											style={{ width: `${Math.min(pct, 100)}%` }}
										/>
									</div>
									<p className="mt-1.5 text-xs text-gray-500">{check.detail}</p>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Service Status */}
			{serviceChecks.length > 0 && (
				<div>
					<h2 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wider">Services</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{serviceChecks.map((check) => (
							<HealthCard key={check.name} check={check} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}
