/**
 * POST /api/modules/install - Install an external module
 * 
 * This adds the npm package to package.json and runs npm install
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../lib/auth";
import { logAction, LOG_LEVELS, ERROR_CODES } from "../../../lib/audit";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export const POST: APIRoute = async ({ cookies, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const body = await request.json();
		const { packageName } = body;

		if (!packageName) {
			return new Response(JSON.stringify({ error: "Package name required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Validate package name format
		if (!packageName.startsWith("serverpilot-module-")) {
			logAction(
				user.username,
				"MODULE_INSTALL",
				packageName,
				"Invalid package name format",
				undefined,
				{ level: LOG_LEVELS.WARN, code: ERROR_CODES.ERR_INVALID_INPUT }
			);
			return new Response(
				JSON.stringify({
					error: "Invalid package name",
					message: "External modules must be named with 'serverpilot-module-' prefix",
					code: ERROR_CODES.ERR_INVALID_INPUT,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Read current package.json
		const packageJsonPath = path.join(process.cwd(), "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

		// Check if already installed
		if (packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]) {
			logAction(
				user.username,
				"MODULE_INSTALL",
				packageName,
				"Package already installed",
				undefined,
				{ level: LOG_LEVELS.WARN, code: ERROR_CODES.ERR_MODULE_INSTALL_FAILED }
			);
			return new Response(
				JSON.stringify({
					error: "Package already installed",
					message: `${packageName} is already in your dependencies`,
					code: ERROR_CODES.ERR_MODULE_INSTALL_FAILED,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Install the package
		console.log(`[modules] Installing ${packageName}...`);

		try {
			await execFileAsync("npm", ["install", packageName, "--save"], {
				cwd: process.cwd(),
				timeout: 120000,
			});

			console.log(`[modules] Successfully installed ${packageName}`);

			logAction(
				user.username,
				"MODULE_INSTALL",
				packageName,
				"Module installed successfully",
				undefined,
				{ level: LOG_LEVELS.INFO, code: "INF007" }
			);

			return new Response(
				JSON.stringify({
					ok: true,
					message: `Module ${packageName} installed. Please rebuild and restart the application.`,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		} catch (installErr) {
			const errorMsg = installErr instanceof Error ? installErr.message : "Unknown error";
			logAction(
				user.username,
				"MODULE_INSTALL",
				packageName,
				`Installation failed: ${errorMsg}`,
				undefined,
				{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_MODULE_INSTALL_FAILED }
			);
			console.error(`[modules] Failed to install ${packageName}:`, installErr);
			return new Response(
				JSON.stringify({
					error: "Installation failed",
					message: errorMsg,
					code: ERROR_CODES.ERR_MODULE_INSTALL_FAILED,
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : "Unknown error";
		logAction(
			user.username,
			"MODULE_INSTALL",
			"unknown",
			`Internal error: ${errorMsg}`,
			undefined,
			{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
		);
		console.error("[modules] Error installing module:", err);
		return new Response(JSON.stringify({ error: "Internal server error", code: ERROR_CODES.ERR_INTERNAL }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
