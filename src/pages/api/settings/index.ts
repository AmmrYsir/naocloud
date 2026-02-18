/**
 * GET /api/settings – Get current settings.
 * POST /api/settings – Update settings.
 */
import type { APIRoute } from "astro";
import { getSettings, updateSettings, type Settings } from "../../../lib/settings";

export const GET: APIRoute = async () => {
	try {
		const settings = getSettings();
		return new Response(JSON.stringify(settings), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[settings] Error getting settings:", err);
		return new Response(JSON.stringify({ error: "Failed to get settings" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const allowedKeys: (keyof Settings)[] = ["hostname", "timezone", "theme"];
		const updates: Partial<Settings> = {};

		for (const key of allowedKeys) {
			if (body[key] !== undefined) {
				(updates as Record<string, string>)[key] = String(body[key]);
			}
		}

		updateSettings(updates);
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[settings] Error updating settings:", err);
		return new Response(JSON.stringify({ error: "Failed to update settings" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
