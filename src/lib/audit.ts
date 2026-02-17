/**
 * audit.ts - Audit logging system
 */
import * as fs from "fs";
import * as path from "path";

export interface AuditLog {
	id: string;
	timestamp: string;
	user: string;
	action: string;
	target: string;
	details: string;
	ip?: string;
}

const AUDIT_FILE = path.join(process.cwd(), "data", "audit.json");
const MAX_LOGS = 10000; // Keep last 10k entries

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

function loadAuditLogs(): AuditLog[] {
	try {
		if (fs.existsSync(AUDIT_FILE)) {
			const data = fs.readFileSync(AUDIT_FILE, "utf-8");
			return JSON.parse(data);
		}
	} catch (err) {
		console.error("[audit] Error loading audit logs:", err);
	}
	return [];
}

function saveAuditLogs(logs: AuditLog[]): void {
	try {
		// Keep only last MAX_LOGS
		const trimmed = logs.slice(-MAX_LOGS);
		fs.writeFileSync(AUDIT_FILE, JSON.stringify(trimmed, null, 2));
	} catch (err) {
		console.error("[audit] Error saving audit logs:", err);
	}
}

export function logAction(
	user: string,
	action: string,
	target: string,
	details: string,
	ip?: string
): void {
	const logs = loadAuditLogs();
	const log: AuditLog = {
		id: generateId(),
		timestamp: new Date().toISOString(),
		user,
		action,
		target,
		details,
		ip,
	};
	
	logs.push(log);
	saveAuditLogs(logs);
	
	// Also log to console for immediate visibility
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
	let logs = loadAuditLogs();
	
	// Apply filters
	if (options.user) {
		logs = logs.filter((l) => l.user === options.user);
	}
	if (options.action) {
		logs = logs.filter((l) => l.action === options.action);
	}
	if (options.startDate) {
		logs = logs.filter((l) => l.timestamp >= options.startDate!);
	}
	if (options.endDate) {
		logs = logs.filter((l) => l.timestamp <= options.endDate!);
	}
	
	// Sort by timestamp descending
	logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	
	// Apply limit
	if (options.limit) {
		logs = logs.slice(0, options.limit);
	}
	
	return logs;
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

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
