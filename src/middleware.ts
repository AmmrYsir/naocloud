/**
 * Astro middleware – Security layer + module initialization.
 * - Enforces LAN-only access on API routes
 * - Adds security headers to all responses
 * - Initializes the module system on first request
 */
import { defineMiddleware } from "astro:middleware";
import { isLocalNetwork } from "./lib/auth";
import { initModules } from "./modules/loader";

let modulesInitialized = false;

export const onRequest = defineMiddleware(async ({ request, url, clientAddress }, next) => {
	// ── Initialize modules once on first request ──
	if (!modulesInitialized) {
		modulesInitialized = true;
		try {
			await initModules();
		} catch (err) {
			console.error("[middleware] Module initialization failed:", err);
		}
	}

	// ── LAN-only guard for API endpoints ──
	if (url.pathname.startsWith("/api/")) {
		const ip = clientAddress
			|| request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
			|| request.headers.get("x-real-ip");

		if (!isLocalNetwork(ip ?? undefined)) {
			return new Response(JSON.stringify({ error: "Access denied: LAN only" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	const response = await next();

	// ── Security headers ──
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-XSS-Protection", "1; mode=block");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	response.headers.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
	);

	return response;
});
