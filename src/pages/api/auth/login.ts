/**
 * POST /api/auth/login – Authenticate user and set JWT cookie.
 * Includes in-memory rate limiting: 5 attempts per IP per 60 seconds.
 */
import type { APIRoute } from "astro";
import { authenticate, TOKEN_COOKIE } from "../../../lib/auth";

/* ── Rate limiter ── */
const RATE_LIMIT_WINDOW = 60_000; // 60 seconds
const RATE_LIMIT_MAX = 5; // max attempts per window
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = attempts.get(ip);
	if (!entry || now > entry.resetAt) {
		attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
		return true;
	}
	entry.count++;
	return entry.count <= RATE_LIMIT_MAX;
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of attempts) {
		if (now > entry.resetAt) attempts.delete(ip);
	}
}, 300_000);

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
	const ip = clientAddress || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

	if (!checkRateLimit(ip)) {
		return new Response(
			JSON.stringify({ error: "Too many login attempts. Try again later." }),
			{ status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
		);
	}

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
			secure: false, // local LAN usage — set true behind HTTPS reverse proxy
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24, // 24h
		});

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
};
