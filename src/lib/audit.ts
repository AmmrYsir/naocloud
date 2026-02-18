import { db } from "./db";

export interface AuditLog {
	id: string;
	timestamp: string;
	user: string;
	action: string;
	target: string;
	details: string;
	ip?: string;
}

interface DbAuditLog {
	id: string;
	timestamp: string;
	user: string;
	action: string;
	target: string;
	details: string | null;
	ip: string | null;
}

const MAX_LOGS = 10000;

function mapDbLog(row: DbAuditLog): AuditLog {
	return {
		id: row.id,
		timestamp: row.timestamp,
		user: row.user,
		action: row.action,
		target: row.target,
		details: row.details || "",
		ip: row.ip || undefined,
	};
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function trimOldLogs(): void {
	const count = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as { count: number };
	if (count.count > MAX_LOGS) {
		const deleteCount = count.count - MAX_LOGS;
		db.prepare(`
			DELETE FROM audit_logs WHERE id IN (
				SELECT id FROM audit_logs ORDER BY timestamp ASC LIMIT ?
			)
		`).run(deleteCount);
	}
}

export function logAction(
	user: string,
	action: string,
	target: string,
	details: string,
	ip?: string
): void {
	const id = generateId();
	const timestamp = new Date().toISOString();

	db.prepare(`
		INSERT INTO audit_logs (id, timestamp, user, action, target, details, ip)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`).run(id, timestamp, user, action, target, details, ip || null);

	trimOldLogs();

	console.log(`[AUDIT] ${user} ${action} ${target}: ${details}${ip ? ` (IP: ${ip})` : ""}`);
}

export function getAuditLogs(
	options: {
		limit?: number;
		user?: string;
		action?: string;
		startDate?: string;
		endDate?: string;
	} = {}
): AuditLog[] {
	let query = "SELECT * FROM audit_logs WHERE 1=1";
	const params: (string | number)[] = [];

	if (options.user) {
		query += " AND user = ?";
		params.push(options.user);
	}
	if (options.action) {
		query += " AND action = ?";
		params.push(options.action);
	}
	if (options.startDate) {
		query += " AND timestamp >= ?";
		params.push(options.startDate);
	}
	if (options.endDate) {
		query += " AND timestamp <= ?";
		params.push(options.endDate);
	}

	query += " ORDER BY timestamp DESC";

	if (options.limit) {
		query += " LIMIT ?";
		params.push(options.limit);
	}

	const rows = db.prepare(query).all(...params) as DbAuditLog[];
	return rows.map(mapDbLog);
}

export function exportAuditLogs(format: "json" | "csv" = "json"): string {
	const logs = getAuditLogs();

	if (format === "csv") {
		const headers = ["ID", "Timestamp", "User", "Action", "Target", "Details", "IP"];
		const rows = logs.map((l) => [
			l.id,
			l.timestamp,
			l.user,
			l.action,
			l.target,
			`"${l.details.replace(/"/g, '""')}"`,
			l.ip || "",
		]);
		return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
	}

	return JSON.stringify(logs, null, 2);
}
