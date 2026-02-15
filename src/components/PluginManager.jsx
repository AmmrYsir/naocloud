/**
 * PluginManager.jsx – Admin panel for managing plugins.
 * Lists installed plugins with enable/disable toggles, configuration UI,
 * component discovery/registration status, and marketplace for installing new plugins.
 */
import { useState, useEffect, useCallback } from "react";
import { clearComponentCache } from "./PluginComponentLoader";

/** Icon map for component types */
const COMPONENT_TYPE_STYLES = {
	page: { label: "Page", color: "text-sky-400 bg-sky-500/10", icon: "📄" },
	widget: { label: "Widget", color: "text-violet-400 bg-violet-500/10", icon: "📊" },
	panel: { label: "Panel", color: "text-teal-400 bg-teal-500/10", icon: "📋" },
};

export default function PluginManager() {
	const [activeTab, setActiveTab] = useState("installed"); // "installed" | "available"
	const [plugins, setPlugins] = useState([]);
	const [marketplace, setMarketplace] = useState([]);
	const [loading, setLoading] = useState(true);
	const [marketplaceLoading, setMarketplaceLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(null);
	const [expandedSection, setExpandedSection] = useState({}); // { [pluginId]: "settings" | "components" | null }
	const [configValues, setConfigValues] = useState({});
	const [toast, setToast] = useState(null);
	const [componentRegistry, setComponentRegistry] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");

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

	const fetchComponents = useCallback(async () => {
		try {
			const res = await fetch("/api/plugins/components?all=true", { credentials: "same-origin" });
			const data = await res.json();
			setComponentRegistry(Array.isArray(data) ? data : []);
		} catch {
			setComponentRegistry([]);
		}
	}, []);

	const fetchMarketplace = useCallback(async (forceRefresh = false) => {
		setMarketplaceLoading(true);
		try {
			const url = `/api/plugins/marketplace${forceRefresh ? "?refresh=true" : ""}`;
			const res = await fetch(url, { credentials: "same-origin" });
			const data = await res.json();
			setMarketplace(data.plugins || []);
		} catch (err) {
			console.error("Failed to load marketplace:", err);
			setMarketplace([]);
		} finally {
			setMarketplaceLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlugins();
		fetchComponents();
	}, [fetchPlugins, fetchComponents]);

	// Fetch marketplace when switching to Available tab
	useEffect(() => {
		if (activeTab === "available" && marketplace.length === 0) {
			fetchMarketplace();
		}
	}, [activeTab, marketplace.length, fetchMarketplace]);

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
				clearComponentCache();
				await Promise.all([fetchPlugins(), fetchComponents()]);
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
				await Promise.all([fetchPlugins(), fetchComponents()]);
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

	const installPlugin = async (pluginId, downloadUrl) => {
		setActionLoading(pluginId);
		try {
			const res = await fetch("/api/plugins/marketplace", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pluginId, downloadUrl }),
			});
			const data = await res.json();
			
			if (data.ok) {
				showToast(data.message || "Plugin installed successfully");
				await Promise.all([fetchPlugins(), fetchComponents(), fetchMarketplace()]);
				setActiveTab("installed"); // Switch to installed tab
			} else {
				showToast(data.error || "Installation failed", "error");
			}
		} catch (err) {
			showToast(err.message || "Network error", "error");
		} finally {
			setActionLoading(null);
		}
	};

	const uninstallPlugin = async (pluginId) => {
		if (!confirm(`Are you sure you want to uninstall this plugin? This will delete all plugin files.`)) {
			return;
		}
		
		setActionLoading(pluginId);
		try {
			const res = await fetch(`/api/plugins/marketplace?id=${encodeURIComponent(pluginId)}`, {
				method: "DELETE",
				credentials: "same-origin",
			});
			const data = await res.json();
			
			if (data.ok) {
				showToast(data.message || "Plugin uninstalled");
				clearComponentCache();
				await Promise.all([fetchPlugins(), fetchComponents(), fetchMarketplace()]);
			} else {
				showToast(data.error || "Uninstall failed", "error");
			}
		} catch (err) {
			showToast(err.message || "Network error", "error");
 } finally {
			setActionLoading(null);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
			</div>
		);
	}

	// Filter marketplace plugins
	const filteredMarketplace = marketplace.filter((plugin) => {
		const matchesSearch = !searchQuery || 
			plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			plugin.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
		
		const matchesCategory = categoryFilter === "all" || plugin.category === categoryFilter;
		
		return matchesSearch && matchesCategory;
	});

	const categories = [
		{ id: "all", label: "All", icon: "🔍" },
		{ id: "monitoring", label: "Monitoring", icon: "📊" },
		{ id: "backup", label: "Backup", icon: "💾" },
		{ id: "networking", label: "Networking", icon: "🌐" },
		{ id: "docker", label: "Docker", icon: "🐳" },
		{ id: "database", label: "Database", icon: "🗄️" },
		{ id: "security", label: "Security", icon: "🔒" },
		{ id: "automation", label: "Automation", icon: "🤖" },
		{ id: "utilities", label: "Utilities", icon: "🛠️" },
	];

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

			{/* Tabs */}
			<div className="flex gap-2 mb-6 border-b border-border-dim">
				<button
					onClick={() => setActiveTab("installed")}
					className={`px-4 py-2 text-sm font-medium transition-all relative ${
						activeTab === "installed"
							? "text-accent"
							: "text-gray-400 hover:text-gray-300"
					}`}
				>
					Installed ({plugins.length})
					{activeTab === "installed" && (
						<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
					)}
				</button>
				<button
					onClick={() => setActiveTab("available")}
					className={`px-4 py-2 text-sm font-medium transition-all relative ${
						activeTab === "available"
							? "text-accent"
							: "text-gray-400 hover:text-gray-300"
					}`}
				>
					Available
					{activeTab === "available" && (
						<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
					)}
				</button>
			</div>

			{/* Installed Tab */}
			{activeTab === "installed" && (
				<>
					{plugins.length === 0 ? (
						<div className="glass-card rounded-2xl p-8 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
								<svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
									<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-gray-300">No plugins installed</h3>
							<p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
								Browse the <button onClick={() => setActiveTab("available")} className="text-accent hover:underline">Available</button> tab to install plugins from the marketplace.
							</p>
						</div>
					) : (
						<div className="grid gap-4">
							{plugins.map((plugin) => {
								const { manifest: m, enabled, config } = plugin;
								const isLoading = actionLoading === m.id;
								const hasSettings = m.contributes?.settings?.fields?.length > 0;
								const hasComponents = m.contributes?.components?.length > 0;
								const pluginComponents = componentRegistry.filter((c) => c.pluginId === m.id);
								const activeSection = expandedSection[m.id] || null;

								// Initialize config values from current config
								if (!configValues[m.id] && config) {
									// Use setTimeout to avoid updating state during render
						setTimeout(() => {
							setConfigValues((prev) => ({ ...prev, [m.id]: { ...config } }));
						}, 0);
					}

					const toggleSection = (section) => {
						setExpandedSection((prev) => ({
							...prev,
							[m.id]: prev[m.id] === section ? null : section,
						}));
					};

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
									{/* Components expand button */}
									{hasComponents && (
										<button
											onClick={() => toggleSection("components")}
											className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/10 ${activeSection === "components" ? "text-accent bg-accent/10" : "text-gray-400 hover:text-white"}`}
											title="Registered Components"
										>
											<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
												<rect x="3" y="3" width="7" height="7" rx="1" />
												<rect x="14" y="3" width="7" height="7" rx="1" />
												<rect x="3" y="14" width="7" height="7" rx="1" />
												<rect x="14" y="14" width="7" height="7" rx="1" />
											</svg>
										</button>
									)}

									{/* Settings expand button */}
									{hasSettings && (
										<button
											onClick={() => toggleSection("settings")}
											className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/10 ${activeSection === "settings" ? "text-accent bg-accent/10" : "text-gray-400 hover:text-white"}`}
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

									{/* Uninstall button */}
									<button
										onClick={() => uninstallPlugin(m.id)}
										disabled={isLoading}
										className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
										title="Uninstall plugin"
									>
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
											<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
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
								{m.contributes?.components?.length > 0 && (
									<span
										className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition"
										onClick={() => toggleSection("components")}
										title="View registered components"
									>
										{m.contributes.components.length} component{m.contributes.components.length > 1 ? "s" : ""}
									</span>
								)}
							</div>

							{/* Settings panel */}
							{activeSection === "settings" && hasSettings && (
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

							{/* Components panel */}
							{activeSection === "components" && hasComponents && (
								<div className="mt-4 border-t border-border-dim pt-4">
									<h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
										<svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
											<rect x="3" y="3" width="7" height="7" rx="1" />
											<rect x="14" y="3" width="7" height="7" rx="1" />
											<rect x="3" y="14" width="7" height="7" rx="1" />
											<rect x="14" y="14" width="7" height="7" rx="1" />
										</svg>
										Registered Components
									</h4>
									<div className="space-y-2">
										{m.contributes.components.map((comp) => {
											const typeStyle = COMPONENT_TYPE_STYLES[comp.type] || COMPONENT_TYPE_STYLES.panel;
											const regEntry = pluginComponents.find((c) => c.key === comp.key);
											const isResolved = regEntry?.resolved ?? false;

											return (
												<div
													key={comp.key}
													className="flex items-center justify-between rounded-lg bg-white/5 border border-white/5 px-3 py-2.5"
												>
													<div className="flex items-center gap-3 min-w-0">
														<span className="text-base shrink-0">{typeStyle.icon}</span>
														<div className="min-w-0">
															<div className="flex items-center gap-2">
																<span className="text-sm font-medium text-white truncate">
																	{comp.title || comp.key}
																</span>
																<span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${typeStyle.color}`}>
																	{typeStyle.label}
																</span>
															</div>
															{comp.description && (
																<p className="text-xs text-gray-500 mt-0.5 truncate">
																	{comp.description}
																</p>
															)}
															<div className="flex items-center gap-2 mt-1">
																<code className="text-[10px] text-gray-600 font-mono">
																	{comp.file}
																</code>
																{comp.route && (
																	<span className="text-[10px] text-gray-500">
																		→ <code className="font-mono">{comp.route}</code>
																	</span>
																)}
															</div>
														</div>
													</div>

													<div className="flex items-center gap-2 shrink-0 ml-3">
														{/* Resolution status */}
														{enabled ? (
															isResolved ? (
																<span className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400" title="Component file found and registered">
																	<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
																		<path d="M5 13l4 4L19 7" />
																	</svg>
																	Resolved
																</span>
															) : (
																<span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400" title="Component file not found">
																	<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
																		<path d="M12 9v2m0 4h.01M12 3l9.5 16.5H2.5L12 3z" />
																	</svg>
																	Missing
																</span>
															)
														) : (
															<span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-600">
																Inactive
															</span>
														)}
													</div>
												</div>
											);
										})}
									</div>

									{/* Component summary */}
									<div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
										<span>{m.contributes.components.length} declared</span>
										{enabled && (
											<>
												<span>·</span>
												<span className="text-green-500">
													{pluginComponents.filter((c) => c.resolved).length} resolved
												</span>
												{pluginComponents.some((c) => !c.resolved) && (
													<>
														<span>·</span>
														<span className="text-amber-500">
															{pluginComponents.filter((c) => !c.resolved).length} missing
														</span>
													</>
												)}
											</>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		)}
	</>
			)}

			{/* Available Tab - Marketplace */}
			{activeTab === "available" && (
				<>
					{/* Search and Filter Bar */}
					<div className="mb-6 flex flex-col md:flex-row gap-3">
						<div className="flex-1 relative">
							<input
								type="text"
								placeholder="Search plugins..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full rounded-xl bg-white/5 border border-border-dim px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 transition focus:border-accent focus:outline-none"
							/>
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.35-4.35" />
							</svg>
						</div>
						<div className="flex gap-2 overflow-x-auto">
							{categories.map((cat) => (
								<button
									key={cat.id}
									onClick={() => setCategoryFilter(cat.id)}
									className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
										categoryFilter === cat.id
											? "bg-accent text-white"
											: "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
									}`}
								>
									<span className="mr-1">{cat.icon}</span>
									{cat.label}
								</button>
							))}
						</div>
						<button
							onClick={() => fetchMarketplace(true)}
							disabled={marketplaceLoading}
							className="rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-white/10 hover:text-gray-300 disabled:opacity-50"
							title="Refresh catalog"
						>
							<svg className={`h-4 w-4 ${marketplaceLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
								<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>
					</div>

					{marketplaceLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
							<span className="ml-3 text-sm text-gray-500">Loading marketplace...</span>
						</div>
					) : filteredMarketplace.length === 0 ? (
						<div className="glass-card rounded-2xl p-8 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
								<svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
									<circle cx="11" cy="11" r="8" />
									<path d="m21 21-4.35-4.35" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-gray-300">No plugins found</h3>
							<p className="mt-2 text-sm text-gray-500">
								Try adjusting your search or filter criteria.
							</p>
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							{filteredMarketplace.map((plugin) => {
								const isLoading = actionLoading === plugin.id;
								const isInstalled = plugin.installed;

								return (
									<div
										key={plugin.id}
										className={`glass-card rounded-2xl p-5 transition-all ${
											plugin.featured ? "border border-accent/30" : "border border-transparent"
										}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3 flex-1 min-w-0">
												<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
													{plugin.icon || "🧩"}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<h4 className="font-semibold text-white truncate">{plugin.name}</h4>
														{plugin.featured && (
															<span className="rounded-md bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-medium text-yellow-400">
																FEATURED
															</span>
														)}
													</div>
													<p className="mt-0.5 text-xs text-gray-500">
														v{plugin.version} · {plugin.author}
													</p>
													<p className="mt-2 text-sm text-gray-400 line-clamp-2">
														{plugin.description}
													</p>
													
													{/* Tags */}
													{plugin.tags && plugin.tags.length > 0 && (
														<div className="mt-2 flex flex-wrap gap-1">
															{plugin.tags.slice(0, 4).map((tag) => (
																<span
																	key={tag}
																	className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
																>
																	{tag}
																</span>
															))}
														</div>
													)}

													{/* Stats */}
													<div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600">
														{plugin.downloads && (
															<span className="flex items-center gap-1">
																<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
																	<path d="M7 10l5 5 5-5M12 3v12" />
																</svg>
																{plugin.downloads.toLocaleString()}
															</span>
														)}
														{plugin.rating && (
															<span className="flex items-center gap-1">
																<svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
																	<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
																</svg>
																{plugin.rating}
															</span>
														)}
														{plugin.installSize && (
															<span>{plugin.installSize}</span>
														)}
													</div>
												</div>
											</div>

											{/* Install/Installed button */}
											<div className="shrink-0">
												{isInstalled ? (
													<div className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400">
														✓ Installed
													</div>
												) : (
													<button
														onClick={() => installPlugin(plugin.id, plugin.downloadUrl)}
														disabled={isLoading}
														className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/80 disabled:opacity-50 disabled:cursor-wait"
													>
														{isLoading ? "Installing..." : "Install"}
													</button>
												)}
											</div>
										</div>

										{/* License and Links */}
										<div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
											{plugin.license && <span>{plugin.license}</span>}
											{plugin.homepage && (
												<>
													<span>·</span>
													<a
														href={plugin.homepage}
														target="_blank"
														rel="noopener noreferrer"
														className="text-accent hover:underline"
													>
														Homepage
													</a>
												</>
											)}
											{plugin.repository && (
												<>
													<span>·</span>
													<a
														href={plugin.repository}
														target="_blank"
														rel="noopener noreferrer"
														className="text-accent hover:underline"
													>
														GitHub
													</a>
												</>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</>
			)}
		</>
	);
}
