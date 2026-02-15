/**
 * PluginManager.jsx – Admin panel for managing plugins.
 * Lists installed plugins with enable/disable toggles and configuration UI.
 */
import { useState, useEffect, useCallback } from "react";

export default function PluginManager() {
	const [plugins, setPlugins] = useState([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(null);
	const [expandedPlugin, setExpandedPlugin] = useState(null);
	const [configValues, setConfigValues] = useState({});
	const [toast, setToast] = useState(null);

	const fetchPlugins = useCallback(async () => {
		try {
			const res = await fetch("/api/plugins", { credentials: "same-origin" });
			const data = await res.json();
			setPlugins(Array.isArray(data) ? data : []);
		} catch {
			setPlugins([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlugins();
	}, [fetchPlugins]);

	const showToast = (message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const togglePlugin = async (id, currentlyEnabled) => {
		setActionLoading(id);
		try {
			const res = await fetch("/api/plugins", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id,
					action: currentlyEnabled ? "disable" : "enable",
				}),
			});
			const data = await res.json();
			if (data.ok) {
				showToast(data.message);
				await fetchPlugins();
			} else {
				showToast(data.error || "Failed", "error");
			}
		} catch {
			showToast("Network error", "error");
		} finally {
			setActionLoading(null);
		}
	};

	const saveConfig = async (id) => {
		const config = configValues[id] || {};
		setActionLoading(id);
		try {
			const res = await fetch("/api/plugins", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id, action: "configure", config }),
			});
			const data = await res.json();
			if (data.ok) {
				showToast("Configuration saved");
				await fetchPlugins();
			} else {
				showToast(data.error || "Failed", "error");
			}
		} catch {
			showToast("Network error", "error");
		} finally {
			setActionLoading(null);
		}
	};

	const updateConfigField = (pluginId, key, value) => {
		setConfigValues((prev) => ({
			...prev,
			[pluginId]: { ...(prev[pluginId] || {}), [key]: value },
		}));
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
			</div>
		);
	}

	if (plugins.length === 0) {
		return (
			<div className="glass-card rounded-2xl p-8 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
					<svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
						<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
				</div>
				<h3 className="text-lg font-semibold text-gray-300">No plugins installed</h3>
				<p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
					Plugins extend ServerPilot with new features. Create a folder inside{" "}
					<code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">plugins/</code>{" "}
					with a <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">manifest.json</code>{" "}
					to get started.
				</p>
			</div>
		);
	}

	return (
		<>
			{toast && (
				<div
					className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${toast.type === "error"
							? "bg-red-500/90 text-white"
							: "bg-green-500/90 text-white"
						}`}
				>
					{toast.message}
				</div>
			)}

			<div className="grid gap-4">
				{plugins.map((plugin) => {
					const { manifest: m, enabled, config } = plugin;
					const isExpanded = expandedPlugin === m.id;
					const isLoading = actionLoading === m.id;
					const hasSettings = m.contributes?.settings?.fields?.length > 0;

					// Initialize config values from current config
					if (!configValues[m.id] && config) {
						// Use setTimeout to avoid updating state during render
						setTimeout(() => {
							setConfigValues((prev) => ({ ...prev, [m.id]: { ...config } }));
						}, 0);
					}

					return (
						<div
							key={m.id}
							className={`glass-card rounded-2xl p-5 transition-all ${enabled ? "border border-accent/30" : "border border-transparent opacity-80"
								}`}
						>
							{/* Header row */}
							<div className="flex items-start justify-between gap-4">
								<div className="flex items-start gap-3 min-w-0">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
										{m.icon || "🧩"}
									</div>
									<div className="min-w-0">
										<h3 className="font-semibold text-white truncate">{m.name}</h3>
										<p className="text-xs text-gray-500 mt-0.5">
											v{m.version}
											{m.author && <span> · by {m.author}</span>}
										</p>
										<p className="text-sm text-gray-400 mt-1">{m.description}</p>
									</div>
								</div>

								<div className="flex items-center gap-3 shrink-0">
									{/* Settings expand button */}
									{hasSettings && (
										<button
											onClick={() => setExpandedPlugin(isExpanded ? null : m.id)}
											className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
											title="Settings"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
												<circle cx="12" cy="12" r="3" />
												<path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
											</svg>
										</button>
									)}

									{/* Enable/disable toggle */}
									<button
										onClick={() => togglePlugin(m.id, enabled)}
										disabled={isLoading}
										className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${enabled ? "bg-accent" : "bg-white/10"
											} ${isLoading ? "opacity-50 cursor-wait" : ""}`}
									>
										<span
											className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5.5 mt-0.5 ml-0.5" : "translate-x-0.5 mt-0.5"
												}`}
										/>
									</button>
								</div>
							</div>

							{/* Contributed features badges */}
							<div className="mt-3 flex flex-wrap gap-1.5">
								{m.contributes?.navItems?.length > 0 && (
									<span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
										{m.contributes.navItems.length} nav item{m.contributes.navItems.length > 1 ? "s" : ""}
									</span>
								)}
								{m.contributes?.widgets?.length > 0 && (
									<span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
										{m.contributes.widgets.length} widget{m.contributes.widgets.length > 1 ? "s" : ""}
									</span>
								)}
								{m.contributes?.apiRoutes?.length > 0 && (
									<span className="rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
										{m.contributes.apiRoutes.length} API route{m.contributes.apiRoutes.length > 1 ? "s" : ""}
									</span>
								)}
								{m.contributes?.commands?.length > 0 && (
									<span className="rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
										{m.contributes.commands.length} command{m.contributes.commands.length > 1 ? "s" : ""}
									</span>
								)}
							</div>

							{/* Settings panel */}
							{isExpanded && hasSettings && (
								<div className="mt-4 border-t border-border-dim pt-4">
									<h4 className="text-sm font-semibold text-gray-300 mb-3">
										{m.contributes.settings.title}
									</h4>
									<div className="space-y-3">
										{m.contributes.settings.fields.map((field) => {
											const currentVal = configValues[m.id]?.[field.key] ?? field.default ?? "";
											return (
												<div key={field.key}>
													<label className="block text-xs font-medium text-gray-400 mb-1">
														{field.label}
														{field.description && (
															<span className="ml-1 text-gray-600">— {field.description}</span>
														)}
													</label>
													{field.type === "boolean" ? (
														<button
															type="button"
															onClick={() => updateConfigField(m.id, field.key, !currentVal)}
															className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${currentVal ? "bg-accent" : "bg-white/10"
																}`}
														>
															<span
																className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${currentVal ? "translate-x-5.5 mt-0.5 ml-0.5" : "translate-x-0.5 mt-0.5"
																	}`}
															/>
														</button>
													) : field.type === "select" ? (
														<select
															value={currentVal}
															onChange={(e) => updateConfigField(m.id, field.key, e.target.value)}
															className="w-full rounded-lg bg-white/5 border border-border-dim px-3 py-1.5 text-sm text-white"
														>
															{field.options?.map((opt) => (
																<option key={opt.value} value={opt.value}>
																	{opt.label}
																</option>
															))}
														</select>
													) : (
														<input
															type={field.type === "number" ? "number" : "text"}
															value={currentVal}
															onChange={(e) =>
																updateConfigField(
																	m.id,
																	field.key,
																	field.type === "number" ? Number(e.target.value) : e.target.value
																)
															}
															className="w-full rounded-lg bg-white/5 border border-border-dim px-3 py-1.5 text-sm text-white"
														/>
													)}
												</div>
											);
										})}
									</div>
									<button
										onClick={() => saveConfig(m.id)}
										disabled={isLoading}
										className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/80 disabled:opacity-50"
									>
										{isLoading ? "Saving..." : "Save Configuration"}
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
}
