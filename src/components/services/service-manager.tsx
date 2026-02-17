/**
 * ServiceManager.tsx - Service management component
 */
import { useState, useEffect } from "react";

interface Service {
	name: string;
	status: "active" | "inactive" | "failed" | "unknown";
	enabled: boolean;
	description: string;
}

interface ServiceLogs {
	name: string;
	logs: string[];
}

export default function ServiceManager() {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedService, setSelectedService] = useState<string | null>(null);
	const [logs, setLogs] = useState<ServiceLogs | null>(null);
	const [showLogs, setShowLogs] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	useEffect(() => {
		fetchServices();
	}, []);

	async function fetchServices() {
		try {
			const res = await fetch("/api/modules/service/list", { credentials: "same-origin" });
			const data = await res.json();
			setServices(data.services || []);
		} catch (err) {
			console.error("Failed to fetch services:", err);
			setError("Failed to load services. This feature requires Linux with systemd.");
		} finally {
			setLoading(false);
		}
	}

	async function performAction(name: string, action: string) {
		setActionLoading(name);
		try {
			const res = await fetch("/api/modules/service/action", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, action }),
			});

			if (res.ok) {
				await fetchServices();
			}
		} catch (err) {
			console.error("Action failed:", err);
		} finally {
			setActionLoading(null);
		}
	}

	async function viewLogs(name: string) {
		setSelectedService(name);
		setShowLogs(true);
		try {
			const res = await fetch(`/api/modules/service/logs?name=${name}&lines=50`, {
				credentials: "same-origin",
			});
			const data = await res.json();
			setLogs(data);
		} catch (err) {
			console.error("Failed to fetch logs:", err);
			setLogs({ name, logs: ["Failed to load logs"] });
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
			{error && (
				<div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-lg">
					<div className="flex items-center gap-2">
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span>{error}</span>
					</div>
					<p className="mt-2 text-sm text-amber-500/80">
						Service management requires a Linux system with systemd. This feature is not available on Windows or macOS.
					</p>
				</div>
			)}

			{/* Service List */}
			<div className="glass-card">
				<h2 className="text-lg font-semibold text-white mb-4">System Services</h2>
				<div className="space-y-3">
					{services.map((service) => (
						<div
							key={service.name}
							className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border-dim"
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<h3 className="font-medium text-white">{service.name}</h3>
									<span
										className={`text-xs px-2 py-0.5 rounded ${
											service.status === "active"
												? "bg-emerald-500/20 text-emerald-400"
												: service.status === "failed"
												? "bg-red-500/20 text-red-400"
												: "bg-gray-500/20 text-gray-400"
										}`}
									>
										{service.status}
									</span>
									{service.enabled && (
										<span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
											enabled
										</span>
									)}
								</div>
								<p className="text-sm text-gray-500 mt-1 truncate">{service.description}</p>
							</div>

							<div className="flex items-center gap-2 ml-4">
								<button
									onClick={() => viewLogs(service.name)}
									className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
								>
									Logs
								</button>
								{service.status === "active" ? (
									<button
										onClick={() => performAction(service.name, "stop")}
										disabled={actionLoading === service.name}
										className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
									>
										{actionLoading === service.name ? "..." : "Stop"}
									</button>
								) : (
									<button
										onClick={() => performAction(service.name, "start")}
										disabled={actionLoading === service.name}
										className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
									>
										{actionLoading === service.name ? "..." : "Start"}
									</button>
								)}
								<button
									onClick={() => performAction(service.name, "restart")}
									disabled={actionLoading === service.name}
									className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
								>
									{actionLoading === service.name ? "..." : "Restart"}
								</button>
							</div>
						</div>
					))}
					{services.length === 0 && !error && (
						<div className="text-center py-8 text-gray-500">
							<p>No services found.</p>
							<p className="text-sm mt-1">Service management requires Linux with systemd.</p>
						</div>
					)}
				</div>
			</div>

			{/* Logs Modal */}
			{showLogs && selectedService && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="glass-card w-full max-w-4xl max-h-[80vh] flex flex-col">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-white">{selectedService} Logs</h2>
							<button
								onClick={() => setShowLogs(false)}
								className="text-gray-400 hover:text-white"
							>
								<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4 font-mono text-sm">
							{logs?.logs.map((log, i) => (
								<div key={i} className="text-gray-300 whitespace-pre-wrap">
									{log}
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
