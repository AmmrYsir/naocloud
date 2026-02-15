/**
 * POST /api/auth/login – Authenticate user and set JWT cookie.
 */
import type { APIRoute } from "astro";
import { authenticate, TOKEN_COOKIE } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { username, password } = body;

		if (!username || !password) {
			return new Response(JSON.stringify({ error: "Username and password required" }), { status: 400 });
		}

		const token = authenticate(username, password);
		if (!token) {
			return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
		}

		cookies.set(TOKEN_COOKIE, token, {
			httpOnly: true,
			secure: false, // local LAN usage
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24, // 24h
		});

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
};
