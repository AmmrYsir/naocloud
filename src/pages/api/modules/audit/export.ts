/**
 * Export Audit Logs API - GET /api/modules/audit/export
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { logAction } from "../../../../lib/audit";
import { exportAuditLogs } from "../../../../lib/audit";

export const GET: APIRoute = async ({ cookies, url }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const format = (url.searchParams.get("format") as "json" | "csv") || "json";
		const data = exportAuditLogs(format);

		logAction(user.username, "EXPORT", "audit", `Exported audit logs as ${format.toUpperCase()}`);

		const contentType = format === "csv" ? "text/csv" : "application/json";
		const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;

		return new Response(data, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
