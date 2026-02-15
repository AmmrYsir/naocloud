/**
 * exec.ts – Centralized safe command execution layer.
 * All system commands are routed through this module.
 * Only whitelisted commands are allowed to prevent arbitrary execution.
 */

import { execSync, exec as execCb } from "node:child_process";

/* ── Whitelist of allowed command prefixes ── */
const ALLOWED_COMMANDS = [
	"top",
	"free",
	"df",
	"uptime",
	"cat /proc",
	"hostname",
	"uname",
	"lscpu",
	"ip addr",
	"ip -s link",
	"timedatectl",
	"systemctl status",
	"systemctl start",
	"systemctl stop",
	"systemctl restart",
	"systemctl is-active",
	"docker ps",
	"docker images",
	"docker volume",
	"docker network",
	"docker stats",
	"docker inspect",
	"docker start",
	"docker stop",
	"docker restart",
	"docker rm",
	"docker rmi",
	"docker logs",
	"docker top",
	"apt update",
	"apt upgrade",
	"apt list",
	"hostnamectl set-hostname",
	"timedatectl set-timezone",
];

function isAllowed(cmd: string): boolean {
	const trimmed = cmd.trim();
	return ALLOWED_COMMANDS.some((prefix) => trimmed.startsWith(prefix));
}

export interface ExecResult {
	ok: boolean;
	stdout: string;
	stderr: string;
	code: number;
}

/**
 * Run a command synchronously (blocking).
 * Returns structured result. Throws on disallowed commands.
 */
export function runSync(cmd: string, timeoutMs = 10_000): ExecResult {
	if (!isAllowed(cmd)) {
		return { ok: false, stdout: "", stderr: `Command not allowed: ${cmd}`, code: 1 };
	}
	try {
		const stdout = execSync(cmd, {
			timeout: timeoutMs,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return { ok: true, stdout: stdout.trim(), stderr: "", code: 0 };
	} catch (err: any) {
		return {
			ok: false,
			stdout: err.stdout?.toString().trim() ?? "",
			stderr: err.stderr?.toString().trim() ?? err.message,
			code: err.status ?? 1,
		};
	}
}

/**
 * Run a command asynchronously (non-blocking).
 */
export function runAsync(cmd: string, timeoutMs = 15_000): Promise<ExecResult> {
	return new Promise((resolve) => {
		if (!isAllowed(cmd)) {
			resolve({ ok: false, stdout: "", stderr: `Command not allowed: ${cmd}`, code: 1 });
			return;
		}
		const _child = execCb(cmd, { timeout: timeoutMs, encoding: "utf-8" }, (err, stdout, stderr) => {
			if (err) {
				resolve({
					ok: false,
					stdout: (stdout ?? "").trim(),
					stderr: (stderr ?? err.message).trim(),
					code: (err as any).code ?? 1,
				});
			} else {
				resolve({ ok: true, stdout: (stdout ?? "").trim(), stderr: (stderr ?? "").trim(), code: 0 });
			}
		});
	});
}
