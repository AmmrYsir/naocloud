import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(process.cwd(), "data", "serverpilot.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

function tableExists(tableName: string): boolean {
	const result = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
		.get(tableName);
	return !!result;
}

function migrateFromFileStorage(): void {
	const usersFile = path.join(process.cwd(), "data", "users.json");

	if (fs.existsSync(usersFile)) {
		try {
			const data = fs.readFileSync(usersFile, "utf-8");
			const users = JSON.parse(data);

			const adminUser = users.find((u: { role: string }) => u.role === "admin");
			if (adminUser) {
				const stmt = db.prepare(`
					INSERT OR IGNORE INTO users (username, hash, role, created_at, last_login)
					VALUES (?, ?, ?, ?, ?)
				`);
				stmt.run(
					adminUser.username,
					adminUser.hash,
					adminUser.role,
					adminUser.createdAt,
					adminUser.lastLogin || null
				);
				console.log("[db] Migrated admin user from file storage");
			}

			fs.unlinkSync(usersFile);
			console.log("[db] Removed users.json");
		} catch (err) {
			console.error("[db] Error migrating users:", err);
		}
	}
}

function seedDefaultAdmin(): void {
	const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
	if (count.count === 0) {
		const DEFAULT_ADMIN_HASH = "$2b$10$EsnaG0qPfjmctTUy2CZoAOL7DSFuGPnfjeJ486dY/iUaVWPH23hru";
		db.prepare(`
			INSERT INTO users (username, hash, role, created_at)
			VALUES (?, ?, ?, ?)
		`).run("admin", DEFAULT_ADMIN_HASH, "admin", new Date().toISOString());
		console.log("[db] Created default admin user");
	}
}

export function initializeDatabase(): void {
	if (!tableExists("users")) {
		db.exec(`
			CREATE TABLE users (
				username TEXT PRIMARY KEY,
				hash TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'viewer',
				created_at TEXT NOT NULL,
				last_login TEXT
			)
		`);
		console.log("[db] Created users table");

		migrateFromFileStorage();
	} else {
		seedDefaultAdmin();
	}

	if (!tableExists("audit_logs")) {
		db.exec(`
			CREATE TABLE audit_logs (
				id TEXT PRIMARY KEY,
				timestamp TEXT NOT NULL,
				user TEXT NOT NULL,
				action TEXT NOT NULL,
				target TEXT NOT NULL,
				details TEXT,
				ip TEXT
			)
		`);
		console.log("[db] Created audit_logs table");

		const auditFile = path.join(process.cwd(), "data", "audit.json");
		if (fs.existsSync(auditFile)) {
			try {
				const data = fs.readFileSync(auditFile, "utf-8");
				const logs = JSON.parse(data);

				const insert = db.prepare(`
					INSERT INTO audit_logs (id, timestamp, user, action, target, details, ip)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`);

				const insertMany = db.transaction((entries: typeof logs) => {
					for (const log of entries) {
						insert.run(log.id, log.timestamp, log.user, log.action, log.target, log.details, log.ip || null);
					}
				});

				insertMany(logs);
				console.log(`[db] Migrated ${logs.length} audit logs`);

				fs.unlinkSync(auditFile);
				console.log("[db] Removed audit.json");
			} catch (err) {
				console.error("[db] Error migrating audit logs:", err);
			}
		}
	}
}

initializeDatabase();
