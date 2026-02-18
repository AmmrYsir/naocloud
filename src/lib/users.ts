import bcrypt from "bcryptjs";
import { db } from "./db";

export type UserRole = "admin" | "operator" | "viewer";

export interface User {
	username: string;
	hash: string;
	role: UserRole;
	createdAt: string;
	lastLogin?: string;
}

interface DbUser {
	username: string;
	hash: string;
	role: UserRole;
	created_at: string;
	last_login: string | null;
}

function mapDbUser(row: DbUser): User {
	return {
		username: row.username,
		hash: row.hash,
		role: row.role,
		createdAt: row.created_at,
		lastLogin: row.last_login || undefined,
	};
}

export function getAllUsers(): Omit<User, "hash">[] {
	const rows = db.prepare("SELECT username, role, created_at, last_login FROM users").all() as DbUser[];
	return rows.map((row) => {
		const { hash, ...user } = mapDbUser(row);
		return user;
	});
}

export function getUser(username: string): User | undefined {
	const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as DbUser | undefined;
	return row ? mapDbUser(row) : undefined;
}

export function createUser(username: string, password: string, role: UserRole): Omit<User, "hash"> {
	const existing = db.prepare("SELECT username FROM users WHERE username = ?").get(username);
	if (existing) {
		throw new Error("User already exists");
	}

	const hash = bcrypt.hashSync(password, 10);
	const createdAt = new Date().toISOString();

	db.prepare(`
		INSERT INTO users (username, hash, role, created_at)
		VALUES (?, ?, ?, ?)
	`).run(username, hash, role, createdAt);

	return { username, role, createdAt };
}

export function updateUser(username: string, updates: Partial<Pick<User, "role" | "hash">>): void {
	const existing = db.prepare("SELECT role FROM users WHERE username = ?").get(username) as
		| { role: UserRole }
		| undefined;
	if (!existing) {
		throw new Error("User not found");
	}

	if (updates.role && updates.role !== "admin") {
		const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as {
			count: number;
		};
		if (adminCount.count === 1 && existing.role === "admin") {
			throw new Error("Cannot change role of the last admin");
		}
	}

	if (updates.hash) {
		db.prepare("UPDATE users SET hash = ? WHERE username = ?").run(updates.hash, username);
	}
	if (updates.role) {
		db.prepare("UPDATE users SET role = ? WHERE username = ?").run(updates.role, username);
	}
}

export function deleteUser(username: string): void {
	const existing = db.prepare("SELECT role FROM users WHERE username = ?").get(username) as
		| { role: UserRole }
		| undefined;
	if (!existing) {
		throw new Error("User not found");
	}

	if (existing.role === "admin") {
		const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as {
			count: number;
		};
		if (adminCount.count === 1) {
			throw new Error("Cannot delete the last admin");
		}
	}

	db.prepare("DELETE FROM users WHERE username = ?").run(username);
}

export function changePassword(username: string, newPassword: string): void {
	const hash = bcrypt.hashSync(newPassword, 10);
	updateUser(username, { hash });
}

export function updateLastLogin(username: string): void {
	const lastLogin = new Date().toISOString();
	db.prepare("UPDATE users SET last_login = ? WHERE username = ?").run(lastLogin, username);
}

export function verifyPassword(username: string, password: string): boolean {
	const user = getUser(username);
	if (!user) return false;
	return bcrypt.compareSync(password, user.hash);
}

export function hasPermission(role: UserRole, permission: string): boolean {
	const permissions: Record<UserRole, string[]> = {
		admin: ["*"],
		operator: [
			"docker:read",
			"docker:write",
			"service:read",
			"service:write",
			"system:read",
			"settings:read",
		],
		viewer: [
			"docker:read",
			"service:read",
			"system:read",
			"settings:read",
		],
	};

	const userPerms = permissions[role] || [];
	return userPerms.includes("*") || userPerms.includes(permission);
}
