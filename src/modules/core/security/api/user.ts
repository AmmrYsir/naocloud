/**
 * User API - PUT/DELETE /api/modules/security/users/:username
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../lib/auth";
import { logAction } from "../../../../lib/audit";
import { updateUser, deleteUser, changePassword, type UserRole } from "../../../../lib/users";

export const PUT: APIRoute = async ({ cookies, request, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const username = params.username;
	if (!username) {
		return new Response(JSON.stringify({ error: "Username required" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { role, password } = body;

		if (role) {
			updateUser(username, { role: role as UserRole });
			logAction(user.username, "UPDATE_USER", username, `Changed role to ${role}`);
		}

		if (password) {
			changePassword(username, password);
			logAction(user.username, "UPDATE_USER", username, "Changed password");
		}

		return new Response(JSON.stringify({ ok: true }), {
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

export const DELETE: APIRoute = async ({ cookies, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const username = params.username;
	if (!username) {
		return new Response(JSON.stringify({ error: "Username required" }), { status: 400 });
	}

	// Prevent deleting yourself
	if (username === user.username) {
		return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400 });
	}

	try {
		deleteUser(username);
		logAction(user.username, "DELETE_USER", username, "Deleted user");

		return new Response(JSON.stringify({ ok: true }), {
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
