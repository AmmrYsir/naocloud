/**
 * api.ts – Client-side data fetching helpers.
 * Used by React islands to call backend API endpoints.
 */

const BASE = "";

export interface ApiResponse<T = any> {
	ok: boolean;
	data?: T;
	error?: string;
}

async function request<T = any>(
	path: string,
	opts: RequestInit = {}
): Promise<ApiResponse<T>> {
	try {
		const res = await fetch(`${BASE}${path}`, {
			credentials: "same-origin",
			headers: { "Content-Type": "application/json", ...(opts.headers as any) },
			...opts,
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			return { ok: false, error: body?.error ?? res.statusText };
		}
		return { ok: true, data: body };
	} catch (err: any) {
		return { ok: false, error: err.message };
	}
}

/* ── System ── */
export const getSystemStats = () => request("/api/system");
export const getSystemInfo = () => request("/api/system/info");

/* ── Docker ── */
export const getContainers = () => request("/api/docker/containers");
export const getImages = () => request("/api/docker/images");
export const getVolumes = () => request("/api/docker/volumes");
export const getNetworks = () => request("/api/docker/networks");
export const containerAction = (id: string, action: string) =>
	request(`/api/docker/container/${action}`, {
		method: "POST",
		body: JSON.stringify({ id }),
	});
export const getContainerLogs = (id: string, tail = 100) =>
	request(`/api/docker/logs?id=${id}&tail=${tail}`);

/* ── Services ── */
export const getServiceStatus = (service: string) =>
	request(`/api/services/status?name=${service}`);
export const serviceAction = (service: string, action: string) =>
	request(`/api/services/${action}`, {
		method: "POST",
		body: JSON.stringify({ name: service }),
	});

/* ── Auth ── */
export const login = (username: string, password: string) =>
	request("/api/auth/login", {
		method: "POST",
		body: JSON.stringify({ username, password }),
	});
export const logout = () => request("/api/auth/logout", { method: "POST" });

/* ── Settings ── */
export const getSettings = () => request("/api/settings");
export const updateSettings = (data: any) =>
	request("/api/settings", { method: "POST", body: JSON.stringify(data) });
export const exportConfig = () => request("/api/settings/export");
export const importConfig = (data: any) =>
	request("/api/settings/import", { method: "POST", body: JSON.stringify(data) });

/* ── Plugins ── */
export const getPlugins = () => request("/api/plugins");
export const pluginAction = (id: string, action: string, config?: any) =>
	request("/api/plugins", {
		method: "POST",
		body: JSON.stringify({ id, action, config }),
	});
export const getPluginWidgets = (placement = "dashboard") =>
	request(`/api/plugins/widgets?placement=${placement}`);
