/**
 * ServiceToggle.jsx – Interactive service control toggle (React island).
 * Controls systemd services like nginx, ssh, ufw via API.
 */
import { useState } from "react";

interface Props {
	name: string;
	label?: string;
	initialActive?: boolean;
}

export default function ServiceToggle({ name, label, initialActive = false }: Props) {
	const [active, setActive] = useState(initialActive);
	const [loading, setLoading] = useState(false);

	async function toggle() {
		setLoading(true);
		const action = active ? "stop" : "start";
		try {
			const res = await fetch(`/api/services/${action}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			if (res.ok) setActive(!active);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="glass-card flex items-center justify-between">
			<div>
				<h4 className="text-sm font-semibold">{label || name}</h4>
				<p className={`mt-0.5 text-xs ${active ? "text-emerald-400" : "text-gray-500"}`}>
					{active ? "Running" : "Stopped"}
				</p>
			</div>
			<button
				onClick={toggle}
				disabled={loading}
				className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${active ? "bg-emerald-500" : "bg-gray-600"
					} ${loading ? "opacity-50" : ""}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${active ? "translate-x-5" : "translate-x-0"
						}`}
				/>
			</button>
		</div>
	);
}
