/**
 * GET|POST /api/auth/logout – Clear auth cookie and redirect to login.
 */
import type { APIRoute } from "astro";
import { TOKEN_COOKIE } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
	cookies.delete(TOKEN_COOKIE, { path: "/" });
	return redirect("/login");
};

export const POST: APIRoute = async ({ cookies }) => {
	cookies.delete(TOKEN_COOKIE, { path: "/" });
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
