/**
 * GET /api/settings/export – Export configuration as JSON.
 */
import type { APIRoute } from "astro";
import { getSettings } from "../../../lib/settings";

export const GET: APIRoute = async () => {
	try {
		const settings = getSettings();
		const config = {
			version: "1.0.0",
			exportedAt: new Date().toISOString(),
			server: {
				hostname: settings.hostname,
				timezone: settings.timezone,
			},
			theme: settings.theme,
		};

		return new Response(JSON.stringify(config, null, 2), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": 'attachment; filename="serverpilot-config.json"',
			},
		});
	} catch (err) {
		console.error("[settings] Error exporting settings:", err);
		return new Response(JSON.stringify({ error: "Failed to export settings" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
