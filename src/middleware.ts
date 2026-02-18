/**
 * Astro middleware – Security layer + module initialization.
 * - Enforces LAN-only access on API routes
 * - Adds security headers to all responses
 * - Checks page access permissions
 * - Initializes the module system on first request
 */
import { defineMiddleware } from "astro:middleware";
import { isLocalNetwork, verifyToken } from "./lib/auth";
import { getAllPages } from "./modules/registry";
import type { UserRole } from "./lib/users";

let modulesInitialized = false;

function getUserFromRequest(request: Request): { username: string; role: UserRole } | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return null;

	const tokenMatch = cookieHeader.match(/sp_token=([^;]+)/);
	if (!tokenMatch) return null;

	return verifyToken(tokenMatch[1]);
}

function hasPagePermission(role: UserRole | undefined, permission: string | undefined): boolean {
	if (!permission) return true;
	if (!role) return false;

	const permissions: Record<UserRole, string[]> = {
		admin: ["*", "admin"],
		operator: ["docker:read", "docker:write", "service:read", "service:write", "system:read", "settings:read"],
		viewer: ["docker:read", "service:read", "system:read", "settings:read"],
	};

	const userPerms = permissions[role] || [];
	return userPerms.includes("*") || userPerms.includes(permission);
}

function getPageRequiredPermission(pathname: string): string | undefined {
	const pages = getAllPages();

	for (const page of pages) {
		if (page.route === pathname) {
			return page.requiredPermission;
		}
	}

	return undefined;
}

export const onRequest = defineMiddleware(async ({ request, url, clientAddress }, next) => {
	const pathname = url.pathname;

	if (!modulesInitialized && !pathname.startsWith("/api/")) {
		modulesInitialized = true;
		try {
			const { initModules } = await import("./modules/loader");
			await initModules();
		} catch (err) {
			console.error("[middleware] Module initialization failed:", err);
		}
	}

	if (pathname.startsWith("/api/")) {
		const ip =
			clientAddress ||
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			request.headers.get("x-real-ip");

		if (!isLocalNetwork(ip ?? undefined)) {
			return new Response(JSON.stringify({ error: "Access denied: LAN only" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	const publicPaths = ["/login", "/api/auth/login"];
	const isPublicPath = publicPaths.includes(pathname);

	if (!isPublicPath && !pathname.startsWith("/api/")) {
		const user = getUserFromRequest(request);

		if (!user) {
			return Response.redirect(new URL("/login", url));
		}

		const requiredPermission = getPageRequiredPermission(pathname);
		if (requiredPermission && !hasPagePermission(user.role, requiredPermission)) {
			return Response.redirect(new URL("/", url));
		}
	}

	const response = await next();

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
