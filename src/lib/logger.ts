/**
 * Logger - File-based logging system with rotation
 */
import * as fs from "fs";
import * as path from "path";

export const LOG_LEVELS = {
	ERROR: "error",
	WARN: "warn",
	INFO: "info",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

export const ERROR_CODES = {
	// General errors (ERR0xx)
	ERR_INTERNAL: "ERR001",
	ERR_NOT_FOUND: "ERR002",
	ERR_UNAUTHORIZED: "ERR003",
	ERR_FORBIDDEN: "ERR004",
	ERR_INVALID_INPUT: "ERR005",
	ERR_TIMEOUT: "ERR006",

	// Auth errors (ERR1xx)
	ERR_LOGIN_FAILED: "ERR101",
	ERR_INVALID_CREDENTIALS: "ERR102",
	ERR_SESSION_EXPIRED: "ERR103",
	ERR_TOKEN_INVALID: "ERR104",

	// Docker errors (ERR2xx)
	ERR_DOCKER_NOT_RUNNING: "ERR201",
	ERR_CONTAINER_NOT_FOUND: "ERR202",
	ERR_CONTAINER_START_FAILED: "ERR203",
	ERR_CONTAINER_STOP_FAILED: "ERR204",
	ERR_CONTAINER_REMOVE_FAILED: "ERR205",
	ERR_IMAGE_NOT_FOUND: "ERR206",
	ERR_IMAGE_PULL_FAILED: "ERR207",
	ERR_VOLUME_NOT_FOUND: "ERR208",
	ERR_VOLUME_CREATE_FAILED: "ERR209",
	ERR_VOLUME_REMOVE_FAILED: "ERR210",
	ERR_VOLUME_BACKUP_FAILED: "ERR211",
	ERR_VOLUME_RESTORE_FAILED: "ERR212",
	ERR_NETWORK_NOT_FOUND: "ERR213",
	ERR_COMPOSE_ACTION_FAILED: "ERR214",
	ERR_COMPOSE_PROJECT_NOT_FOUND: "ERR215",

	// Service errors (ERR3xx)
	ERR_SERVICE_NOT_FOUND: "ERR301",
	ERR_SERVICE_ACTION_FAILED: "ERR302",
	ERR_SERVICE_STATUS_FAILED: "ERR303",

	// Module errors (ERR4xx)
	ERR_MODULE_NOT_FOUND: "ERR401",
	ERR_MODULE_INSTALL_FAILED: "ERR402",
	ERR_MODULE_UNINSTALL_FAILED: "ERR403",
	ERR_MODULE_ENABLE_FAILED: "ERR404",
	ERR_MODULE_DISABLE_FAILED: "ERR405",

	// Settings errors (ERR5xx)
	ERR_SETTINGS_SAVE_FAILED: "ERR501",
	ERR_SETTINGS_LOAD_FAILED: "ERR502",
	ERR_IMPORT_FAILED: "ERR503",
	ERR_EXPORT_FAILED: "ERR504",

	// User management errors (ERR6xx)
	ERR_USER_NOT_FOUND: "ERR601",
	ERR_USER_CREATE_FAILED: "ERR602",
	ERR_USER_DELETE_FAILED: "ERR603",
	ERR_USER_UPDATE_FAILED: "ERR604",
	ERR_PASSWORD_CHANGE_FAILED: "ERR605",
	ERR_LAST_ADMIN_CANNOT_DELETE: "ERR606",
	ERR_CANNOT_DELETE_SELF: "ERR607",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | "INF000";

const LOG_DIR = "./data/logs";
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 30; // Keep 30 days of logs

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	code: ErrorCode;
	message: string;
	user?: string;
	action?: string;
	target?: string;
	ip?: string;
}

function ensureLogDir(): void {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR, { recursive: true });
	}
}

function getLogFilePath(date: Date = new Date()): string {
	const dateStr = date.toISOString().split("T")[0];
	return path.join(LOG_DIR, `server-${dateStr}.log`);
}

function rotateLogsIfNeeded(): void {
	ensureLogDir();
	const logFile = getLogFilePath();

	if (fs.existsSync(logFile)) {
		const stats = fs.statSync(logFile);
		if (stats.size > MAX_LOG_SIZE) {
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const archivePath = path.join(LOG_DIR, `server-${timestamp}.log`);
			fs.renameSync(logFile, archivePath);
		}
	}

	cleanupOldLogs();
}

function cleanupOldLogs(): void {
	ensureLogDir();
	const files = fs.readdirSync(LOG_DIR)
		.filter((f) => f.startsWith("server-") && f.endsWith(".log"))
		.sort()
		.reverse();

	if (files.length > MAX_LOG_FILES) {
		const toDelete = files.slice(MAX_LOG_FILES);
		for (const file of toDelete) {
			fs.unlinkSync(path.join(LOG_DIR, file));
		}
	}
}

function writeLog(entry: LogEntry): void {
	rotateLogsIfNeeded();
	const logFile = getLogFilePath();
	const logLine = JSON.stringify(entry) + "\n";
	fs.appendFileSync(logFile, logLine, { encoding: "utf-8" });
}

export function logError(
	code: ErrorCode,
	message: string,
	options?: {
		user?: string;
		action?: string;
		target?: string;
		ip?: string;
	}
): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: LOG_LEVELS.ERROR,
		code,
		message,
		...options,
	};
	writeLog(entry);
	console.error(`[${code}] ${message}`, options ? JSON.stringify(options) : "");
}

export function logWarn(
	code: ErrorCode,
	message: string,
	options?: {
		user?: string;
		action?: string;
		target?: string;
		ip?: string;
	}
): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: LOG_LEVELS.WARN,
		code,
		message,
		...options,
	};
	writeLog(entry);
	console.warn(`[${code}] ${message}`, options ? JSON.stringify(options) : "");
}

export function logInfo(
	message: string,
	options?: {
		user?: string;
		action?: string;
		target?: string;
		ip?: string;
		code?: ErrorCode;
	}
): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: LOG_LEVELS.INFO,
		code: options?.code ?? "INF000",
		message,
		...options,
	};
	writeLog(entry);
	console.log(`[INFO] ${message}`);
}

export function getLogs(options?: {
	level?: LogLevel;
	code?: string;
	user?: string;
	action?: string;
	search?: string;
	limit?: number;
}): LogEntry[] {
	ensureLogDir();
	const entries: LogEntry[] = [];
	const limit = options?.limit ?? 1000;

	// Read today's log file first, then previous days
	const today = new Date();
	const logFiles = [0, -1, -2, -3, -4, -5, -6, -7].map((offset) => {
		const d = new Date(today);
		d.setDate(d.getDate() + offset);
		return getLogFilePath(d);
	}).filter((f) => fs.existsSync(f));

	for (const logFile of logFiles) {
		if (entries.length >= limit) break;

		const content = fs.readFileSync(logFile, { encoding: "utf-8" });
		const lines = content.trim().split("\n").reverse();

		for (const line of lines) {
			if (entries.length >= limit) break;
			if (!line.trim()) continue;

			try {
				const entry = JSON.parse(line) as LogEntry;

				// Apply filters
				if (options?.level && entry.level !== options.level) continue;
				if (options?.code && !entry.code.startsWith(options.code)) continue;
				if (options?.user && entry.user !== options.user) continue;
				if (options?.action && entry.action !== options.action) continue;
				if (options?.search) {
					const search = options.search.toLowerCase();
					const matches =
						entry.message.toLowerCase().includes(search) ||
						entry.target?.toLowerCase().includes(search) ||
						entry.code.toLowerCase().includes(search);
					if (!matches) continue;
				}

				entries.push(entry);
			} catch {
				// Skip invalid JSON lines
			}
		}
	}

	return entries;
}

export function getLogFiles(): string[] {
	ensureLogDir();
	return fs.readdirSync(LOG_DIR)
		.filter((f) => f.startsWith("server-") && f.endsWith(".log"))
		.sort()
		.reverse();
}

export function exportLogs(format: "json" | "csv" = "json", options?: {
	level?: LogLevel;
	startDate?: string;
	endDate?: string;
}): string {
	const logs = getLogs({ limit: 10000, ...options });

	if (format === "csv") {
		const headers = ["timestamp", "level", "code", "message", "user", "action", "target", "ip"];
		const rows = logs.map((l) =>
			[
				l.timestamp,
				l.level,
				l.code,
				`"${l.message.replace(/"/g, '""')}"`,
				l.user ?? "",
				l.action ?? "",
				l.target ?? "",
				l.ip ?? "",
			].join(",")
		);
		return [headers.join(","), ...rows].join("\n");
	}

	return JSON.stringify(logs, null, 2);
}
