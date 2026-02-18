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
	canDisable: boolean;
	navItems: string[];
	apiRoutes: string[];
}

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	variant?: "danger" | "warning" | "info";
	onConfirm: () => void;
	onCancel: () => void;
}

function ConfirmationModal({
	isOpen,
	title,
	message,
	confirmLabel,
	variant = "danger",
	onConfirm,
	onCancel,
}: ConfirmationModalProps) {
	if (!isOpen) return null;

	const variantStyles = {
		danger: {
			icon: "bg-red-500/20 text-red-400",
			button: "bg-red-500 hover:bg-red-600",
		},
		warning: {
			icon: "bg-yellow-500/20 text-yellow-400",
			button: "bg-yellow-500 hover:bg-yellow-600",
		},
		info: {
			icon: "bg-blue-500/20 text-blue-400",
			button: "bg-blue-500 hover:bg-blue-600",
		},
	};

	const styles = variantStyles[variant];

	return (
		<div className="fixed inset-0 z-50">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}></div>
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative w-full max-w-md rounded-2xl border border-border-dim bg-[#1a1a2e] p-6 shadow-2xl">
					<div className="flex items-center gap-3 mb-4">
						<div className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.icon}`}>
							{variant === "danger" && (
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							)}
							{variant === "warning" && (
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							)}
							{variant === "info" && (
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
									<path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							)}
						</div>
						<h3 className="text-lg font-semibold text-gray-200">{title}</h3>
					</div>
					<p className="text-sm text-gray-400 mb-6">{message}</p>
					<div className="flex gap-3">
						<button
							onClick={onCancel}
							className="flex-1 rounded-xl border border-border-dim bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/10"
						>
							Cancel
						</button>
						<button
							onClick={onConfirm}
							className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${styles.button}`}
						>
							{confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
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

	// Modal state
	const [modalOpen, setModalOpen] = useState(false);
	const [modalConfig, setModalConfig] = useState<{
		title: string;
		message: string;
		confirmLabel: string;
		variant: "danger" | "warning" | "info";
		moduleId: string;
		action: "enable" | "disable" | "uninstall";
	}>({
		title: "",
		message: "",
		confirmLabel: "",
		variant: "danger",
		moduleId: "",
		action: "enable",
	});

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

	function openToggleModal(module: Module, enable: boolean) {
		const action = enable ? "enable" : "disable";
		setModalConfig({
			title: enable ? "Enable Module" : "Disable Module",
			message: `Are you sure you want to ${action} "${module.name}"? ${!enable ? "This may affect dependent features." : ""}`,
			confirmLabel: enable ? "Enable" : "Disable",
			variant: enable ? "info" : "warning",
			moduleId: module.id,
			action,
		});
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
	}

	async function handleToggle() {
		const { moduleId, action } = modalConfig;
		const enable = action === "enable";

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

			closeModal();
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

	async function uninstallModule(moduleId: string, moduleName: string) {
		setModalConfig({
			title: "Uninstall Module",
			message: `Are you sure you want to uninstall "${moduleName}"? This will permanently remove the module.`,
			confirmLabel: "Uninstall",
			variant: "danger",
			moduleId,
			action: "uninstall",
		});
		setModalOpen(true);
	}

	async function handleUninstall() {
		const { moduleId } = modalConfig;

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

			closeModal();
			await fetchModules();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to uninstall module");
		} finally {
			setActionLoading(null);
		}
	}

	function handleModalConfirm() {
		if (modalConfig.action === "uninstall") {
			handleUninstall();
		} else {
			handleToggle();
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
		<div className="space-y-4">
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

					{/* Module List - Compact */}
					{filteredModules.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							{searchQuery ? "No modules found" : "No modules installed"}
						</div>
					) : (
						<div className="space-y-2">
							{filteredModules.map((module) => (
								<div
									key={module.id}
									className={`glass-card flex items-center justify-between py-3 px-4 ${
										!module.enabled || !module.canDisable ? "opacity-60" : ""
									}`}
								>
									<div className="flex-1 min-w-0 flex items-center gap-3">
										{/* Module Icon */}
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20">
											<svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
												<path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
											</svg>
										</div>

										{/* Module Info */}
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<h3 className="font-medium text-white truncate">{module.name}</h3>
												<span className="text-xs text-gray-500 shrink-0">v{module.version}</span>
												<span
													className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
														module.type === "core"
															? "bg-blue-500/20 text-blue-400"
															: "bg-purple-500/20 text-purple-400"
													}`}
												>
													{module.type}
												</span>
												{!module.enabled && (
													<span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 shrink-0">
														Off
													</span>
												)}
											</div>
											<p className="text-xs text-gray-500 truncate mt-0.5">{module.description}</p>
										</div>
									</div>

									{/* Actions */}
									<div className="flex items-center gap-2 ml-3">
										{!module.canDisable ? (
											// Protected module - show lock badge
											<div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-gray-500/10 rounded-lg">
												<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
													<path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
												</svg>
												Protected
											</div>
										) : module.type === "core" ? (
											<>
												<button
													onClick={() => openToggleModal(module, !module.enabled)}
													disabled={actionLoading === module.id}
													className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
														module.enabled
															? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
															: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
													} disabled:opacity-50`}
												>
													{actionLoading === module.id ? "..." : module.enabled ? "Disable" : "Enable"}
												</button>
											</>
										) : (
											<>
												<button
													onClick={() => openToggleModal(module, !module.enabled)}
													disabled={actionLoading === module.id}
													className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
														module.enabled
															? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
															: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
													} disabled:opacity-50`}
												>
													{actionLoading === module.id ? "..." : module.enabled ? "Disable" : "Enable"}
												</button>
												<button
													onClick={() => uninstallModule(module.id, module.name)}
													disabled={actionLoading === module.id}
													className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
												>
													Remove
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
				<div className="space-y-4">
					<div className="glass-card p-4">
						<h3 className="text-sm font-semibold text-white mb-2">Install External Module</h3>
						<p className="text-xs text-gray-400 mb-4">
							Install a third-party module from npm. The module will be available after restart.
						</p>
						<div className="flex gap-2">
							<input
								type="text"
								placeholder="Module name (e.g., serverpilot-module-nginx)"
								value={installInput}
								onChange={(e) => setInstallInput(e.target.value)}
								className="flex-1 bg-surface border border-border-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
								onKeyDown={(e) => e.key === "Enter" && installModule()}
							/>
							<button
								onClick={installModule}
								disabled={installing || !installInput.trim()}
								className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{installing ? "..." : "Install"}
							</button>
						</div>
					</div>

					<div className="glass-card p-4">
						<h3 className="text-sm font-semibold text-white mb-2">How It Works</h3>
						<ul className="text-xs text-gray-400 space-y-1.5">
							<li className="flex items-start gap-2">
								<span className="text-accent shrink-0">1.</span>
								<span>Enter npm package name (must start with <code className="text-gray-300">serverpilot-module-</code>)</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-accent shrink-0">2.</span>
								<span>Click Install to add the module</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-accent shrink-0">3.</span>
								<span>Rebuild and restart to load the new module</span>
							</li>
						</ul>
					</div>
				</div>
			)}

			{/* Reusable Confirmation Modal */}
			<ConfirmationModal
				isOpen={modalOpen}
				title={modalConfig.title}
				message={modalConfig.message}
				confirmLabel={modalConfig.confirmLabel}
				variant={modalConfig.variant}
				onConfirm={handleModalConfirm}
				onCancel={closeModal}
			/>
		</div>
	);
}
