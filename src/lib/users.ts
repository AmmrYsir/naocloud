/**
 * users.ts - User management with file-based storage
 */
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

export type UserRole = "admin" | "operator" | "viewer";

export interface User {
	username: string;
	hash: string;
	role: UserRole;
	createdAt: string;
	lastLogin?: string;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

// Default admin hash
const ADMIN_HASH = "$2b$10$EsnaG0qPfjmctTUy2CZoAOL7DSFuGPnfjeJ486dY/iUaVWPH23hru";

function loadUsers(): User[] {
	try {
		if (fs.existsSync(USERS_FILE)) {
			const data = fs.readFileSync(USERS_FILE, "utf-8");
			return JSON.parse(data);
		}
	} catch (err) {
		console.error("[users] Error loading users:", err);
	}
	
	// Return default admin if no users file
	return [
		{
			username: "admin",
			hash: ADMIN_HASH,
			role: "admin",
			createdAt: new Date().toISOString(),
		},
	];
}

function saveUsers(users: User[]): void {
	try {
		fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
	} catch (err) {
		console.error("[users] Error saving users:", err);
		throw new Error("Failed to save users");
	}
}

export function getAllUsers(): Omit<User, "hash">[] {
	const users = loadUsers();
	return users.map(({ hash, ...user }) => user);
}

export function getUser(username: string): User | undefined {
	const users = loadUsers();
	return users.find((u) => u.username === username);
}

export function createUser(username: string, password: string, role: UserRole): User {
	const users = loadUsers();
	
	if (users.find((u) => u.username === username)) {
		throw new Error("User already exists");
	}
	
	const hash = bcrypt.hashSync(password, 10);
	const user: User = {
		username,
		hash,
		role,
		createdAt: new Date().toISOString(),
	};
	
	users.push(user);
	saveUsers(users);
	
	const { hash: _, ...userWithoutHash } = user;
	return userWithoutHash as User;
}

export function updateUser(username: string, updates: Partial<Pick<User, "role" | "hash">>): void {
	const users = loadUsers();
	const index = users.findIndex((u) => u.username === username);
	
	if (index === -1) {
		throw new Error("User not found");
	}
	
	// Prevent changing the last admin's role
	if (updates.role && updates.role !== "admin") {
		const adminCount = users.filter((u) => u.role === "admin").length;
		if (adminCount === 1 && users[index].role === "admin") {
			throw new Error("Cannot change role of the last admin");
		}
	}
	
	users[index] = { ...users[index], ...updates };
	saveUsers(users);
}

export function deleteUser(username: string): void {
	const users = loadUsers();
	const index = users.findIndex((u) => u.username === username);
	
	if (index === -1) {
		throw new Error("User not found");
	}
	
	// Prevent deleting the last admin
	if (users[index].role === "admin") {
		const adminCount = users.filter((u) => u.role === "admin").length;
		if (adminCount === 1) {
			throw new Error("Cannot delete the last admin");
		}
	}
	
	users.splice(index, 1);
	saveUsers(users);
}

export function changePassword(username: string, newPassword: string): void {
	const hash = bcrypt.hashSync(newPassword, 10);
	updateUser(username, { hash });
}

export function updateLastLogin(username: string): void {
	const users = loadUsers();
	const index = users.findIndex((u) => u.username === username);
	if (index !== -1) {
		users[index].lastLogin = new Date().toISOString();
		saveUsers(users);
	}
}

export function verifyPassword(username: string, password: string): boolean {
	const user = getUser(username);
	if (!user) return false;
	return bcrypt.compareSync(password, user.hash);
}

// Permission checking
export function hasPermission(role: UserRole, permission: string): boolean {
	const permissions: Record<UserRole, string[]> = {
		admin: ["*"], // Admin can do everything
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
