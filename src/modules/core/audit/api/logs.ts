/**
 * Audit Logs API - GET /api/modules/audit/logs
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { getAuditLogs, LOG_LEVELS } from "../../../../lib/audit";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const userFilter = url.searchParams.get("user") || undefined;
		const actionFilter = url.searchParams.get("action") || undefined;
		const levelFilter = url.searchParams.get("level") || undefined;
		const codeFilter = url.searchParams.get("code") || undefined;
		const searchFilter = url.searchParams.get("search") || undefined;
		const startDate = url.searchParams.get("startDate") || undefined;
		const endDate = url.searchParams.get("endDate") || undefined;

		// Validate level filter
		let level: typeof LOG_LEVELS[keyof typeof LOG_LEVELS] | undefined;
		if (levelFilter && Object.values(LOG_LEVELS).includes(levelFilter as any)) {
			level = levelFilter as any;
		}

		const logs = getAuditLogs({
			limit,
			user: userFilter,
			action: actionFilter,
			level,
			code: codeFilter,
			search: searchFilter,
			startDate,
			endDate,
		});

		return new Response(JSON.stringify({ logs }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[audit] Error fetching logs:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
