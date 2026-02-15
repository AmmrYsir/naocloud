/**
 * auth.ts – JWT authentication helpers (server-side).
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { AstroCookies } from "astro";

const JWT_SECRET = import.meta.env.JWT_SECRET || "serverpilot-dev-secret-change-me";
const TOKEN_COOKIE = "sp_token";
const TOKEN_EXPIRY = "24h";

export interface User {
	username: string;
	role: "admin" | "viewer";
}

/* Default admin account – in production, store hashed passwords in a config file */
const DEFAULT_USERS: Array<{ username: string; hash: string; role: "admin" | "viewer" }> = [
	{
		username: "admin",
		hash: bcrypt.hashSync("admin", 10),
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

/** Check if the request IP is on local LAN. */
export function isLocalNetwork(ip: string | undefined): boolean {
	if (!ip) return true; // SSR localhost
	return (
		ip === "127.0.0.1" ||
		ip === "::1" ||
		ip.startsWith("192.168.") ||
		ip.startsWith("10.") ||
		ip.startsWith("172.16.") ||
		ip.startsWith("172.17.") ||
		ip.startsWith("172.18.") ||
		ip.startsWith("172.19.") ||
		ip.startsWith("172.2") ||
		ip.startsWith("172.3")
	);
}

export { TOKEN_COOKIE, JWT_SECRET };
