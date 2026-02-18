/**
 * POST /api/settings/import – Import configuration from JSON.
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { updateSettings } from "../../../lib/settings";

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	if (user.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });

	try {
		const config = await request.json();

		const updates: Record<string, string> = {};

		if (config?.server?.hostname) {
			updates.hostname = String(config.server.hostname).replace(/[^a-zA-Z0-9\-]/g, "");
		}

		if (config?.server?.timezone) {
			updates.timezone = String(config.server.timezone).replace(/[^a-zA-Z0-9\/\_\-]/g, "");
		}

		if (config?.theme) {
			updates.theme = String(config.theme);
		}

		updateSettings(updates);

		return new Response(
			JSON.stringify({ ok: true }),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch (err) {
		console.error("[settings] Error importing settings:", err);
		return new Response(JSON.stringify({ error: "Failed to import settings" }), { status: 500 });
	}
};
