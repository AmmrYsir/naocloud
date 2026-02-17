/**
 * ModuleWidgets.tsx - Renders dashboard widgets from modules
 * 
 * Fetches widgets from /api/modules/widgets and renders them
 * at the specified placement (dashboard by default)
 */
import { useState, useEffect } from "react";

interface Widget {
	id: string;
	name: string;
	component: string;
	placement: string;
	props?: Record<string, unknown>;
}

interface Props {
	placement?: "dashboard" | "sidebar" | "header";
	className?: string;
}

export default function ModuleWidgets({ placement = "dashboard", className = "" }: Props) {
	const [widgets, setWidgets] = useState<Widget[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchWidgets() {
			try {
				const res = await fetch(`/api/modules/widgets?placement=${placement}`);
				const data = await res.json();

				if (data.widgets) {
					setWidgets(data.widgets);
				}
			} catch (err) {
				console.error("Failed to load widgets:", err);
				setError("Failed to load widgets");
			} finally {
				setLoading(false);
			}
		}

		fetchWidgets();
	}, [placement]);

	if (loading) {
		return (
			<div className={`space-y-4 ${className}`}>
				<div className="animate-pulse bg-gray-700 h-32 rounded-lg" />
			</div>
		);
	}

	if (error || widgets.length === 0) {
		return null;
	}

	return (
		<div className={`space-y-4 ${className}`}>
			{widgets.map((widget) => (
				<div
					key={widget.id}
					className="glass-card"
					data-widget-id={widget.id}
					data-widget-name={widget.name}
				>
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-medium text-gray-300">{widget.name}</h3>
					</div>
					{/* Widget content would be rendered here - for now shows placeholder */}
					<div className="text-xs text-gray-500">
						Widget: {widget.component}
					</div>
				</div>
			))}
		</div>
	);
}
