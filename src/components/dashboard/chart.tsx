/**
 * Chart.jsx – Lightweight sparkline / mini-chart component (React island).
 * Uses a simple SVG-based sparkline for dashboard stat cards.
 */
import { useState, useEffect, useRef } from "react";

interface SparklineProps {
	data: number[];
	color?: string;
	height?: number;
	width?: number;
	filled?: boolean;
	label?: string;
	className?: string;
}

export default function Chart({
	data = [],
	color = "#3b82f6",
	height = 40,
	width = 120,
	filled = true,
	label,
	className = "",
}: SparklineProps) {
	if (!data.length) {
		return (
			<div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
				<span className="text-xs text-gray-500">No data</span>
			</div>
		);
	}

	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const range = max - min || 1;
	const padding = 2;
	const effectiveW = width - padding * 2;
	const effectiveH = height - padding * 2;

	const points = data.map((v, i) => {
		const x = padding + (i / (data.length - 1 || 1)) * effectiveW;
		const y = padding + effectiveH - ((v - min) / range) * effectiveH;
		return `${x},${y}`;
	});

	const linePath = `M ${points.join(" L ")}`;
	const fillPath = `${linePath} L ${padding + effectiveW},${padding + effectiveH} L ${padding},${padding + effectiveH} Z`;

	return (
		<div className={`inline-flex flex-col items-start ${className}`}>
			{label && <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</span>}
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
				{filled && (
					<path d={fillPath} fill={color} fillOpacity={0.15} />
				)}
				<path
					d={linePath}
					fill="none"
					stroke={color}
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{/* Latest value dot */}
				{data.length > 0 && (
					<circle
						cx={padding + effectiveW}
						cy={padding + effectiveH - ((data[data.length - 1] - min) / range) * effectiveH}
						r={2.5}
						fill={color}
					/>
				)}
			</svg>
		</div>
	);
}

/**
 * LiveChart – Sparkline that auto-fetches data from an endpoint at intervals.
 */
interface LiveChartProps {
	endpoint: string;
	field: string;
	color?: string;
	label?: string;
	interval?: number; // ms
	maxPoints?: number;
	height?: number;
	width?: number;
	className?: string;
}

export function LiveChart({
	endpoint,
	field,
	color = "#3b82f6",
	label,
	interval = 3000,
	maxPoints = 20,
	height = 40,
	width = 120,
	className = "",
}: LiveChartProps) {
	const [data, setData] = useState<number[]>([]);
	const intervalRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch(endpoint);
				const json = await res.json();
				const value = field.split(".").reduce((obj: any, key) => obj?.[key], json);
				if (typeof value === "number") {
					setData((prev) => [...prev.slice(-(maxPoints - 1)), value]);
				}
			} catch {
				// Silently ignore fetch errors
			}
		};

		fetchData();
		intervalRef.current = window.setInterval(fetchData, interval);
		return () => clearInterval(intervalRef.current);
	}, [endpoint, field, interval, maxPoints]);

	return <Chart data={data} color={color} label={label} height={height} width={width} className={className} />;
}
