/**
 * DashboardStats.jsx – Auto-refreshing system stats panel (React island).
 * Fetches system data periodically and renders stat cards + sparklines.
 */
import { useState, useEffect, useRef } from "react";
import Chart from "./chart.tsx";

interface SystemStats {
	cpu?: { percent?: number; cores?: number; loadAvg?: string };
	memory?: { used?: string; total?: string; usedPercent?: number };
	disk?: { used?: string; total?: string; usedPercent?: number };
	uptime?: string;
	network?: { tx?: string; rx?: string };
}

interface History {
	cpu: number[];
	ram: number[];
	disk: number[];
}

export default function DashboardStats() {
	const [stats, setStats] = useState<SystemStats | null>(null);
	const [history, setHistory] = useState<History>({ cpu: [], ram: [], disk: [] });
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchStats = async () => {
		try {
			const res = await fetch("/api/system");
			if (!res.ok) throw new Error("Failed to fetch");
			const data = await res.json();
			setStats(data);
			setError(null);
			setHistory((prev) => ({
				cpu: [...prev.cpu.slice(-19), data.cpu?.percent ?? 0],
				ram: [...prev.ram.slice(-19), data.memory?.usedPercent ?? 0],
				disk: [...prev.disk.slice(-19), data.disk?.usedPercent ?? 0],
			}));
		} catch (err) {
			setError("Unable to connect to system API");
		}
	};

	useEffect(() => {
		fetchStats();
		intervalRef.current = setInterval(fetchStats, 3000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	if (error) {
		return (
			<div className="glass-card text-center">
				<p className="text-sm text-red-400">{error}</p>
				<p className="mt-1 text-xs text-gray-500">Make sure the server is running</p>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="glass-card animate-pulse">
						<div className="h-4 w-16 rounded bg-white/10 mb-2" />
						<div className="h-8 w-24 rounded bg-white/10" />
					</div>
				))}
			</div>
		);
	}

	const cards = [
		{
			label: "CPU",
			value: `${stats.cpu?.percent?.toFixed(1) ?? 0}%`,
			subtitle: `${stats.cpu?.cores ?? "?"} cores · Load: ${stats.cpu?.loadAvg ?? "N/A"}`,
			percent: stats.cpu?.percent ?? 0,
			color: "#3b82f6",
			history: history.cpu,
			icon: (
				<svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<rect x="4" y="4" width="16" height="16" rx="2" />
					<path d="M9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m-3 6h3M20 9h3m-3 6h3" />
				</svg>
			),
		},
		{
			label: "Memory",
			value: stats.memory?.used ?? "N/A",
			subtitle: `Total: ${stats.memory?.total ?? "N/A"}`,
			percent: stats.memory?.usedPercent ?? 0,
			color: "#8b5cf6",
			history: history.ram,
			icon: (
				<svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<rect x="3" y="7" width="18" height="10" rx="2" />
					<path d="M7 7V4m4 3V4m4 3V4" />
				</svg>
			),
		},
		{
			label: "Disk",
			value: stats.disk?.used ?? "N/A",
			subtitle: `Total: ${stats.disk?.total ?? "N/A"}`,
			percent: stats.disk?.usedPercent ?? 0,
			color: "#f59e0b",
			history: history.disk,
			icon: (
				<svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<ellipse cx="12" cy="5" rx="9" ry="3" />
					<path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3M21 5v14c0 1.66-4.03 3-9 3s-9-1.34-9-3V5" />
				</svg>
			),
		},
		{
			label: "Uptime",
			value: stats.uptime ?? "N/A",
			subtitle: `Network: ↑${stats.network?.tx ?? "N/A"} ↓${stats.network?.rx ?? "N/A"}`,
			percent: undefined,
			color: "#06b6d4",
			history: [],
			icon: (
				<svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
			),
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map((card, i) => (
				<div key={i} className="glass-card flex flex-col gap-3">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
								{card.icon}
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-gray-400">{card.label}</p>
								<p className="mt-0.5 text-2xl font-bold tracking-tight">{card.value}</p>
							</div>
						</div>
						{card.history.length > 1 && (
							<Chart data={card.history} color={card.color} height={36} width={80} />
						)}
					</div>
					<p className="text-xs text-gray-500">{card.subtitle}</p>
					{card.percent !== undefined && (
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
							<div
								className={`h-full rounded-full transition-all duration-500 ${card.percent >= 90 ? "bg-red-500" : card.percent >= 70 ? "bg-yellow-500" : "bg-blue-500"
									}`}
								style={{ width: `${Math.min(card.percent, 100)}%` }}
							/>
						</div>
					)}
				</div>
			))}
		</div>
	);
}
