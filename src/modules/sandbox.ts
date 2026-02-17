/**
 * Module sandbox - provides safe command execution for modules
 * 
 * Each module can define allowed commands in its manifest
 * This utility enforces those restrictions
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SandboxConfig {
	allowedCommands: string[];
	allowedPaths?: string[];
	timeout?: number;
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

/**
 * Execute a command within the module's sandbox
 * @param moduleId - The module's ID (for logging)
 * @param config - Sandbox configuration from module manifest
 * @param command - Command to execute (must be in allowedCommands)
 * @param args - Arguments to pass to command
 */
export async function execInSandbox(
	moduleId: string,
	config: SandboxConfig,
	command: string,
	args: string[] = []
): Promise<ExecResult> {
	// Validate command is in whitelist
	if (!config.allowedCommands.includes(command)) {
		throw new Error(
			`Module "${moduleId}" attempted to execute disallowed command: ${command}. Allowed: ${config.allowedCommands.join(", ")}`
		);
	}

	const timeout = config.timeout ?? 30000;

	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			timeout,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024, // 10MB
		});

		return {
			stdout,
			stderr,
			code: 0,
		};
	} catch (err) {
		if (err instanceof Error) {
			// Handle timeout
			if (err.message.includes("ETIMEDOUT") || err.message.includes("timeout")) {
				throw new Error(`Command "${command}" timed out after ${timeout}ms`);
			}

			// Handle exec error
			const execErr = err as { code?: number; stdout?: string; stderr?: string };
			return {
				stdout: execErr.stdout ?? "",
				stderr: execErr.stderr ?? err.message,
				code: execErr.code ?? 1,
			};
		}
		throw err;
	}
}

/**
 * Validate that a module's sandbox configuration is safe
 */
export function validateSandboxConfig(config: SandboxConfig): string[] {
	const warnings: string[] = [];

	if (!config.allowedCommands || config.allowedCommands.length === 0) {
		warnings.push("Module has no allowed commands - it won't be able to execute anything");
	}

	// Warn about dangerous commands
	const dangerous = ["rm", "del", "format", "mkfs", "dd"];
	for (const cmd of config.allowedCommands) {
		const baseCmd = cmd.split(" ")[0];
		if (dangerous.includes(baseCmd)) {
			warnings.push(`Module allows dangerous command: ${cmd}`);
		}
	}

	return warnings;
}
