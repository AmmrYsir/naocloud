/**
 * exec.ts – Centralized safe command execution layer.
 * All system commands are routed through this module.
 *
 * SECURITY: Uses execFileSync/execFile with argument arrays (no shell).
 * Commands are defined in a registry with exact binary paths and static args.
 * Dynamic arguments are passed separately and validated per-command.
 */

import { execFileSync, execFile as execFileCb } from "node:child_process";

/* ── Command registry: maps command keys to binary + static args ── */
export interface CommandDef {
	bin: string;
	args: string[];
}

/**
 * Registry of allowed commands. Each key maps to a binary and its fixed arguments.
 * Dynamic arguments (container IDs, service names, etc.) are appended by callers
 * via the `extraArgs` parameter after validation.
 */
const COMMAND_REGISTRY: Record<string, CommandDef> = {
	// System info (read-only)
	"cat:proc/stat": { bin: "cat", args: ["/proc/stat"] },
	"cat:proc/loadavg": { bin: "cat", args: ["/proc/loadavg"] },
	"cat:proc/cpuinfo": { bin: "cat", args: ["/proc/cpuinfo"] },
	"cat:proc/uptime": { bin: "cat", args: ["/proc/uptime"] },
	"cat:proc/net/dev": { bin: "cat", args: ["/proc/net/dev"] },
	"cat:proc/version": { bin: "cat", args: ["/proc/version"] },
	hostname: { bin: "hostname", args: [] },
	uname: { bin: "uname", args: [] },
	uptime: { bin: "uptime", args: [] },
	lscpu: { bin: "lscpu", args: [] },
	"ip:addr": { bin: "ip", args: ["addr"] },
	"ip:link": { bin: "ip", args: ["-s", "link"] },
	"free": { bin: "free", args: ["-b"] },
	"df": { bin: "df", args: ["-B1", "/"] },
	timedatectl: { bin: "timedatectl", args: [] },

	// Systemd service management
	"systemctl:is-active": { bin: "systemctl", args: ["is-active"] },
	"systemctl:status": { bin: "systemctl", args: ["status"] },
	"systemctl:start": { bin: "systemctl", args: ["start"] },
	"systemctl:stop": { bin: "systemctl", args: ["stop"] },
	"systemctl:restart": { bin: "systemctl", args: ["restart"] },

	// Docker read-only
	"docker:ps": { bin: "docker", args: ["ps", "-a", "--format", "{{json .}}"] },
	"docker:images": { bin: "docker", args: ["images", "--format", "{{json .}}"] },
	"docker:volumes": { bin: "docker", args: ["volume", "ls", "--format", "{{json .}}"] },
	"docker:networks": { bin: "docker", args: ["network", "ls", "--format", "{{json .}}"] },
	"docker:logs": { bin: "docker", args: ["logs"] },

	// Docker container lifecycle
	"docker:start": { bin: "docker", args: ["start"] },
	"docker:stop": { bin: "docker", args: ["stop"] },
	"docker:restart": { bin: "docker", args: ["restart"] },
	"docker:rm": { bin: "docker", args: ["rm", "-f"] },

	// System configuration
	"hostnamectl:set-hostname": { bin: "hostnamectl", args: ["set-hostname"] },
	"timedatectl:set-timezone": { bin: "timedatectl", args: ["set-timezone"] },
};

export interface ExecResult {
	ok: boolean;
	stdout: string;
	stderr: string;
	code: number;
}

/**
 * Run a registered command synchronously (blocking).
 * @param key - Registry key (e.g. "docker:ps", "free", "cat:proc/stat")
 * @param extraArgs - Additional arguments appended after the fixed args (already validated by caller)
 * @param timeoutMs - Execution timeout in milliseconds
 */
export function runSync(key: string, extraArgs: string[] = [], timeoutMs = 10_000): ExecResult {
	const def = COMMAND_REGISTRY[key];
	if (!def) {
		return { ok: false, stdout: "", stderr: `Command not registered: ${key}`, code: 1 };
	}
	const allArgs = [...def.args, ...extraArgs];
	try {
		const stdout = execFileSync(def.bin, allArgs, {
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
 * Run a registered command asynchronously (non-blocking).
 * @param key - Registry key
 * @param extraArgs - Additional arguments appended after the fixed args
 * @param timeoutMs - Execution timeout in milliseconds
 */
export function runAsync(key: string, extraArgs: string[] = [], timeoutMs = 15_000): Promise<ExecResult> {
	return new Promise((resolve) => {
		const def = COMMAND_REGISTRY[key];
		if (!def) {
			resolve({ ok: false, stdout: "", stderr: `Command not registered: ${key}`, code: 1 });
			return;
		}
		const allArgs = [...def.args, ...extraArgs];
		execFileCb(def.bin, allArgs, { timeout: timeoutMs, encoding: "utf-8" }, (err, stdout, stderr) => {
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
