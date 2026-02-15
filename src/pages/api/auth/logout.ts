/**
 * POST /api/auth/logout – Clear auth cookie.
 * GET handler removed to prevent CSRF logout via image/link tags.
 */
import type { APIRoute } from "astro";
import { TOKEN_COOKIE } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies }) => {
	cookies.delete(TOKEN_COOKIE, { path: "/" });
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
