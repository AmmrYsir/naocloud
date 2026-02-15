/**
 * PluginComponentLoader.jsx – Dynamic loader for plugin-contributed React components.
 *
 * Fetches a plugin's component JS file via the component-file API endpoint,
 * creates a blob URL, dynamically imports it, and renders the exported component.
 *
 * React is exposed on `window.__SP_REACT__` so plugin components can use hooks
 * without bundling their own React copy. Plugin components should destructure
 * from `window.__SP_REACT__` at the top of their file.
 *
 * Usage:
 *   <PluginComponentLoader pluginId="service-logs" componentKey="log-viewer" />
 *
 * The loaded component receives any extra props passed to PluginComponentLoader,
 * plus a `pluginId` prop for context.
 */
import * as React from "react";
import { useState, useEffect, useRef, createElement } from "react";

// Expose React globally so dynamically-loaded plugin components can use hooks
// without needing to bundle or import React themselves.
if (typeof window !== "undefined") {
	window.__SP_REACT__ = React;
}

/**
 * In-memory cache of loaded component modules to avoid re-fetching.
 * Key: "pluginId:componentKey"
 */
const componentCache = new Map();

/**
 * Registry of all discovered plugin components.
 * Populated by fetchComponentRegistry().
 */
let registryCache = null;
let registryPromise = null;

/**
 * Fetch the full component registry from the API.
 * @param {boolean} includeAll - Include components from disabled plugins.
 * @returns {Promise<Array>}
 */
export async function fetchComponentRegistry(includeAll = false) {
	if (registryCache && !includeAll) return registryCache;

	const url = includeAll
		? "/api/plugins/components?all=true"
		: "/api/plugins/components";

	try {
		const res = await fetch(url, { credentials: "same-origin" });
		const data = await res.json();
		if (!includeAll) registryCache = Array.isArray(data) ? data : [];
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

/**
 * Get components filtered by type from the registry.
 * @param {"page"|"widget"|"panel"} type
 * @returns {Promise<Array>}
 */
export async function getComponentsByType(type) {
	const registry = await fetchComponentRegistry();
	return registry.filter((c) => c.type === type);
}

/**
 * Get the component declaration for a specific route.
 * @param {string} route - e.g. "/logs"
 * @returns {Promise<object|null>}
 */
export async function getComponentForRoute(route) {
	const registry = await fetchComponentRegistry();
	return registry.find((c) => c.type === "page" && c.route === route) || null;
}

/**
 * Dynamically load a plugin component module.
 * @param {string} pluginId
 * @param {string} componentKey
 * @returns {Promise<{default: React.ComponentType} | null>}
 */
async function loadComponentModule(pluginId, componentKey) {
	const cacheKey = `${pluginId}:${componentKey}`;
	if (componentCache.has(cacheKey)) return componentCache.get(cacheKey);

	try {
		const res = await fetch(
			`/api/plugins/component-file?plugin=${encodeURIComponent(pluginId)}&key=${encodeURIComponent(componentKey)}`,
			{ credentials: "same-origin" }
		);

		if (!res.ok) return null;

		const code = await res.text();
		const blob = new Blob([code], { type: "application/javascript" });
		const blobUrl = URL.createObjectURL(blob);

		const mod = await import(/* @vite-ignore */ blobUrl);
		URL.revokeObjectURL(blobUrl);

		componentCache.set(cacheKey, mod);
		return mod;
	} catch (err) {
		console.error(`[PluginComponentLoader] Failed to load ${cacheKey}:`, err);
		return null;
	}
}

/**
 * Clear the component cache (useful after plugin enable/disable).
 */
export function clearComponentCache() {
	componentCache.clear();
	registryCache = null;
	registryPromise = null;
}

/**
 * React component that dynamically loads and renders a plugin component.
 */
export default function PluginComponentLoader({
	pluginId,
	componentKey,
	fallback = null,
	errorFallback = null,
	...props
}) {
	const [Component, setComponent] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		setLoading(true);
		setError(null);

		loadComponentModule(pluginId, componentKey)
			.then((mod) => {
				if (!mountedRef.current) return;
				if (mod?.default) {
					setComponent(() => mod.default);
				} else if (mod) {
					// Try to find the first exported component
					const exported = Object.values(mod).find(
						(v) => typeof v === "function"
					);
					if (exported) {
						setComponent(() => exported);
					} else {
						setError("No component exported from module");
					}
				} else {
					setError("Component not found or plugin is disabled");
				}
			})
			.catch((err) => {
				if (!mountedRef.current) return;
				setError(err.message || "Failed to load component");
			})
			.finally(() => {
				if (mountedRef.current) setLoading(false);
			});

		return () => {
			mountedRef.current = false;
		};
	}, [pluginId, componentKey]);

	if (loading) {
		return (
			fallback || (
				<div className="flex items-center justify-center py-8">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
					<span className="ml-2 text-sm text-gray-500">
						Loading plugin component...
					</span>
				</div>
			)
		);
	}

	if (error) {
		return (
			errorFallback || (
				<div className="glass-card rounded-xl border border-red-500/20 p-4">
					<div className="flex items-center gap-2 text-red-400">
						<svg
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4m0 4h.01" />
						</svg>
						<span className="text-sm font-medium">
							Plugin Component Error
						</span>
					</div>
					<p className="mt-1 text-xs text-gray-500">
						{pluginId}/{componentKey}: {error}
					</p>
				</div>
			)
		);
	}

	if (!Component) return null;

	return createElement(Component, { pluginId, ...props });
}

/**
 * Hook to load plugin components for a specific placement.
 * Returns { components, loading } where components is an array of
 * { pluginId, key, title, Component } objects.
 *
 * Usage:
 *   const { components, loading } = usePluginComponents("widget");
 *   components.map(c => <c.Component key={c.key} />)
 */
export function usePluginComponents(type) {
	const [components, setComponents] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function discover() {
			try {
				const registry = await fetchComponentRegistry();
				const filtered = registry.filter((c) => c.type === type);

				const loaded = await Promise.all(
					filtered.map(async (decl) => {
						const mod = await loadComponentModule(
							decl.pluginId,
							decl.key
						);
						const Comp = mod?.default || null;
						return {
							pluginId: decl.pluginId,
							pluginName: decl.pluginName,
							key: decl.key,
							title: decl.title,
							description: decl.description,
							route: decl.route,
							defaultProps: decl.defaultProps,
							Component: Comp,
						};
					})
				);

				if (!cancelled) {
					setComponents(loaded.filter((c) => c.Component));
					setLoading(false);
				}
			} catch {
				if (!cancelled) setLoading(false);
			}
		}

		discover();
		return () => {
			cancelled = true;
		};
	}, [type]);

	return { components, loading };
}
