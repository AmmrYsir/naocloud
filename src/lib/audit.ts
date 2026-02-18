/**
 * Audit Logs - File-based logging system
 * This module handles user action audit logs stored in files
 */
import { logInfo, logError, logWarn, getLogs, exportLogs, LOG_LEVELS, ERROR_CODES, type LogLevel } from "./logger";

export type { LogLevel };
export { LOG_LEVELS, ERROR_CODES };

export interface AuditLog {
	id: string;
	timestamp: string;
	level: LogLevel;
	code: string;
	user?: string;
	action: string;
	target: string;
	details: string;
	ip?: string;
}

export function logAction(
	user: string,
	action: string,
	target: string,
	details: string,
	ip?: string,
	options?: {
		level?: LogLevel;
		code?: string;
	}
): void {
	// Write to file logger
	const logFn = options?.level === LOG_LEVELS.ERROR
		? logError
		: options?.level === LOG_LEVELS.WARN
			? logWarn
			: logInfo;

	logFn(
		options?.code as any ?? "INF000",
		`${user} ${action} ${target}: ${details}`,
		{ user, action, target, ip }
	);

	console.log(`[AUDIT] ${options?.level?.toUpperCase() ?? "INFO"} ${user} ${action} ${target}: ${details}${ip ? ` (IP: ${ip})` : ""}`);
}

export function logSystemError(
	code: string,
	message: string,
	options?: {
		user?: string;
		action?: string;
		target?: string;
		ip?: string;
	}
): void {
	logError(code as any, message, options);
}

export function getAuditLogs(
	options: {
		limit?: number;
		user?: string;
		action?: string;
		level?: LogLevel;
		code?: string;
		search?: string;
		startDate?: string;
		endDate?: string;
	} = {}
): AuditLog[] {
	const logs = getLogs({
		level: options.level,
		code: options.code,
		user: options.user,
		action: options.action,
		search: options.search,
		limit: options.limit,
	});

	// Filter by date if specified
	let filtered = logs;
	if (options.startDate) {
		filtered = filtered.filter((l) => l.timestamp >= options.startDate!);
	}
	if (options.endDate) {
		filtered = filtered.filter((l) => l.timestamp <= options.endDate!);
	}

	return filtered.map((l, i) => ({
		id: `${i}-${l.timestamp}`,
		timestamp: l.timestamp,
		level: l.level,
		code: l.code,
		user: l.user,
		action: l.action || "SYSTEM",
		target: l.target || "",
		details: l.message,
		ip: l.ip,
	}));
}

export function exportAuditLogs(format: "json" | "csv" = "json", options?: {
	level?: LogLevel;
	startDate?: string;
	endDate?: string;
}): string {
	return exportLogs(format, options);
}
