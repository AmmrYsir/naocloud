/**
 * Password API - POST /api/modules/security/password
 * Allows users to change their own password
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { logAction } from "../../../../lib/audit";
import { changePassword, verifyPassword } from "../../../../lib/users";

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const body = await request.json();
		const { currentPassword, newPassword } = body;

		if (!currentPassword || !newPassword) {
			return new Response(JSON.stringify({ error: "Missing required fields" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Verify current password
		if (!verifyPassword(user.username, currentPassword)) {
			return new Response(JSON.stringify({ error: "Current password is incorrect" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		changePassword(user.username, newPassword);
		logAction(user.username, "CHANGE_PASSWORD", user.username, "Changed own password");

		return new Response(JSON.stringify({ ok: true, message: "Password changed successfully" }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
