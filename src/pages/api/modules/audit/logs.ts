/**
 * Audit Logs API - GET /api/modules/audit/logs
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { getAuditLogs } from "../../../../lib/audit";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const userFilter = url.searchParams.get("user") || undefined;
		const actionFilter = url.searchParams.get("action") || undefined;

		const logs = getAuditLogs({
			limit,
			user: userFilter,
			action: actionFilter,
		});

		return new Response(JSON.stringify({ logs }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
