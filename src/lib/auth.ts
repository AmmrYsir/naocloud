/**
 * auth.ts – JWT authentication helpers (server-side).
 *
 * JWT_SECRET is read from environment variables at runtime.
 * Create a .env file in the project root:
 *   JWT_SECRET=your-random-secret-here
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { AstroCookies } from "astro";

// Use process.env for runtime (Node adapter) with import.meta.env fallback for dev
const JWT_SECRET = process.env.JWT_SECRET || import.meta.env.JWT_SECRET || "serverpilot-dev-secret-change-me";
const TOKEN_COOKIE = "sp_token";
const TOKEN_EXPIRY = "24h";

// Startup validation: refuse to run in production without a real secret
if (JWT_SECRET === "serverpilot-dev-secret-change-me") {
	if (import.meta.env.PROD) {
		throw new Error(
			"FATAL: JWT_SECRET is not set. Create a .env file with:\n  JWT_SECRET=your-random-secret-here\nOr set it as an environment variable before starting the server."
		);
	}
	console.warn("[AUTH] WARNING: Using default JWT_SECRET. Set JWT_SECRET in .env before deploying.");
}

export interface User {
	username: string;
	role: "admin" | "viewer";
}

/* Pre-computed bcrypt hash for default "admin" password.
 * Generated with: bcrypt.hashSync("admin", 10)
 * This avoids blocking the event loop on module load. */
const ADMIN_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/* Default admin account – in production, store hashed passwords in a config file */
const DEFAULT_USERS: Array<{ username: string; hash: string; role: "admin" | "viewer" }> = [
	{
		username: "admin",
		hash: ADMIN_HASH,
		role: "admin",
	},
];

/** Validate credentials & return JWT token. */
export function authenticate(username: string, password: string): string | null {
	const user = DEFAULT_USERS.find((u) => u.username === username);
	if (!user) return null;
	if (!bcrypt.compareSync(password, user.hash)) return null;
	return jwt.sign({ username: user.username, role: user.role } satisfies User, JWT_SECRET, {
		expiresIn: TOKEN_EXPIRY,
	});
}

/** Verify JWT token and return user payload. */
export function verifyToken(token: string): User | null {
	try {
		return jwt.verify(token, JWT_SECRET) as User;
	} catch {
		return null;
	}
}

/** Extract user from Astro cookie. */
export function getUserFromCookies(cookies: AstroCookies): User | null {
	const token = cookies.get(TOKEN_COOKIE)?.value;
	if (!token) return null;
	return verifyToken(token);
}

/** Check if the request IP is on local LAN (RFC 1918 + loopback). */
export function isLocalNetwork(ip: string | undefined): boolean {
	if (!ip) return true; // SSR localhost
	// Normalize IPv6-mapped IPv4
	const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
	if (normalized === "127.0.0.1" || normalized === "::1") return true;
	if (normalized.startsWith("192.168.")) return true;
	if (normalized.startsWith("10.")) return true;
	// RFC 1918: 172.16.0.0 – 172.31.255.255
	const m = normalized.match(/^172\.(\d+)\./);
	if (m) {
		const second = parseInt(m[1], 10);
		if (second >= 16 && second <= 31) return true;
	}
	return false;
}

export { TOKEN_COOKIE };
