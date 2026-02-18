/**
 * Account API - DELETE /api/modules/security/account
 * Allows users to delete their own account
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { deleteUser, getAllUsers } from "../../../../lib/users";
import { logAction } from "../../../../lib/audit";

export const DELETE: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const username = user.username;

	try {
		// If user is admin, check if they are the only admin
		if (user.role === "admin") {
			const allUsers = getAllUsers();
			const adminCount = allUsers.filter((u) => u.role === "admin").length;

			if (adminCount <= 1) {
				return new Response(
					JSON.stringify({ error: "Cannot delete your account. You are the only admin. Promote another user to admin first." }),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		// Delete the user's account
		deleteUser(username);
		logAction(username, "DELETE_ACCOUNT", username, "Self-deleted account");

		return new Response(JSON.stringify({ ok: true, message: "Account deleted successfully" }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[account] Delete error:", err);
		return new Response(
			JSON.stringify({ error: err instanceof Error ? err.message : "Failed to delete account" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
