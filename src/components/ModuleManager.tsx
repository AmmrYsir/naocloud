/**
 * Module Manager component - React island for managing modules
 */
import { useState, useEffect } from "react";

interface Module {
	id: string;
	name: string;
	version: string;
	description: string;
	type: "core" | "external";
	enabled: boolean;
	navItems: string[];
	apiRoutes: string[];
}

export default function ModuleManager() {
	const [modules, setModules] = useState<Module[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"installed" | "available">("installed");
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [installInput, setInstallInput] = useState("");
	const [installing, setInstalling] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchModules();
	}, []);

	async function fetchModules() {
		try {
			const res = await fetch("/api/modules", { credentials: "same-origin" });
			const data = await res.json();
			setModules(data.modules || []);
		} catch (err) {
			console.error("Failed to fetch modules:", err);
			setError("Failed to load modules");
		} finally {
			setLoading(false);
		}
	}

	async function toggleModule(moduleId: string, enable: boolean) {
		setActionLoading(moduleId);
		setError(null);

		try {
			const res = await fetch(`/api/modules/${moduleId}/toggle`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ enabled: enable }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to toggle module");
			}

			await fetchModules();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to toggle module");
		} finally {
			setActionLoading(null);
		}
	}

	async function installModule() {
		if (!installInput.trim()) return;

		setInstalling(true);
		setError(null);

		try {
			const res = await fetch("/api/modules/install", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ packageName: installInput.trim() }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to install module");
			}

			setInstallInput("");
			await fetchModules();
			setActiveTab("installed");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to install module");
		} finally {
			setInstalling(false);
		}
	}

	async function uninstallModule(moduleId: string) {
		if (!confirm(`Are you sure you want to uninstall "${moduleId}"? This will remove the module.`)) {
			return;
		}

		setActionLoading(moduleId);
		setError(null);

		try {
			const res = await fetch(`/api/modules/${moduleId}/uninstall`, {
				method: "POST",
				credentials: "same-origin",
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to uninstall module");
			}

			await fetchModules();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to uninstall module");
		} finally {
			setActionLoading(null);
		}
	}

	const filteredModules = modules.filter((m) => {
		const matchesSearch =
			m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.description.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

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
				<div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
					{error}
				</div>
			)}

			{/* Tab Navigation */}
			<div className="flex gap-2 border-b border-border-dim">
				<button
					onClick={() => setActiveTab("installed")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "installed"
							? "border-accent text-accent"
							: "border-transparent text-gray-400 hover:text-gray-300"
					}`}
				>
					Installed ({modules.length})
				</button>
				<button
					onClick={() => setActiveTab("available")}
					className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
						activeTab === "available"
							? "border-accent text-accent"
							: "border-transparent text-gray-400 hover:text-gray-300"
					}`}
				>
					Install Module
				</button>
			</div>

			{/* Installed Tab */}
			{activeTab === "installed" && (
				<>
					{/* Search */}
					<div className="relative">
						<input
							type="text"
							placeholder="Search modules..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-surface border border-border-dim rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-accent"
						/>
						<svg
							className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>

					{/* Module List */}
					{filteredModules.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							{searchQuery ? "No modules found" : "No modules installed"}
						</div>
					) : (
						<div className="space-y-3">
							{filteredModules.map((module) => (
								<div
									key={module.id}
									className={`glass-card flex items-center justify-between ${
										!module.enabled ? "opacity-60" : ""
									}`}
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<h3 className="font-semibold text-white truncate">{module.name}</h3>
											<span className="text-xs text-gray-500">v{module.version}</span>
											<span
												className={`text-xs px-2 py-0.5 rounded ${
													module.type === "core"
														? "bg-blue-500/20 text-blue-400"
														: "bg-purple-500/20 text-purple-400"
												}`}
											>
												{module.type}
											</span>
											{!module.enabled && (
												<span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
													Disabled
												</span>
											)}
										</div>
										<p className="text-sm text-gray-400 mt-1">{module.description}</p>
										<div className="flex gap-4 mt-2 text-xs text-gray-500">
											<span>{module.navItems.length} nav items</span>
											<span>{module.apiRoutes.length} API routes</span>
										</div>
									</div>

									<div className="flex items-center gap-2 ml-4">
										{module.type === "core" ? (
											<button
												onClick={() => toggleModule(module.id, !module.enabled)}
												disabled={actionLoading === module.id}
												className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
													module.enabled
														? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
														: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
												} disabled:opacity-50`}
											>
												{actionLoading === module.id
													? "..."
													: module.enabled
														? "Disable"
														: "Enable"}
											</button>
										) : (
											<>
												<button
													onClick={() => toggleModule(module.id, !module.enabled)}
													disabled={actionLoading === module.id}
													className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
														module.enabled
															? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
															: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
													} disabled:opacity-50`}
												>
													{actionLoading === module.id
														? "..."
														: module.enabled
															? "Disable"
															: "Enable"}
												</button>
												<button
													onClick={() => uninstallModule(module.id)}
													disabled={actionLoading === module.id}
													className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
												>
													Uninstall
												</button>
											</>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{/* Install Tab */}
			{activeTab === "available" && (
				<div className="space-y-6">
					<div className="glass-card">
						<h3 className="text-lg font-semibold text-white mb-2">Install External Module</h3>
						<p className="text-sm text-gray-400 mb-4">
							Install a third-party module from npm. The module will be added to your installation and
							available after restart.
						</p>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Module name (e.g., serverpilot-module-nginx)"
								value={installInput}
								onChange={(e) => setInstallInput(e.target.value)}
								className="flex-1 bg-surface border border-border-dim rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent"
								onKeyDown={(e) => e.key === "Enter" && installModule()}
							/>
							<button
								onClick={installModule}
								disabled={installing || !installInput.trim()}
								className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{installing ? "Installing..." : "Install"}
							</button>
						</div>
					</div>

					<div className="glass-card">
						<h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
						<ul className="text-sm text-gray-400 space-y-2">
							<li className="flex items-start gap-2">
								<span className="text-accent">1.</span>
								Enter the npm package name (must start with <code>serverpilot-module-</code>)
							</li>
							<li className="flex items-start gap-2">
								<span className="text-accent">2.</span>
								Click Install to add the module to your project
							</li>
							<li className="flex items-start gap-2">
								<span className="text-accent">3.</span>
								Rebuild and restart the application to load the new module
							</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
