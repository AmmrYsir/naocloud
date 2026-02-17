/**
 * POST /api/modules/:moduleId/uninstall - Uninstall an external module
 */
import type { APIRoute } from "astro";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export const POST: APIRoute = async ({ params }) => {
	const moduleId = params.moduleId;

	if (!moduleId) {
		return new Response(JSON.stringify({ error: "Module ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Map module ID to package name
	const packageName = `serverpilot-module-${moduleId}`;

	try {
		// Check if it's an external module (core modules can't be uninstalled)
		const packageJsonPath = path.join(process.cwd(), "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

		const isInstalled =
			packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName];

		if (!isInstalled) {
			return new Response(
				JSON.stringify({
					error: "Module not found",
					message: "This module is not installed or is a core module",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Uninstall the package
		console.log(`[modules] Uninstalling ${packageName}...`);

		try {
			await execFileAsync("npm", ["uninstall", packageName], {
				cwd: process.cwd(),
				timeout: 120000,
			});

			console.log(`[modules] Successfully uninstalled ${packageName}`);

			return new Response(
				JSON.stringify({
					ok: true,
					message: `Module ${moduleId} uninstalled. Please rebuild and restart the application.`,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		} catch (installErr) {
			console.error(`[modules] Failed to uninstall ${packageName}:`, installErr);
			return new Response(
				JSON.stringify({
					error: "Uninstallation failed",
					message: installErr instanceof Error ? installErr.message : "Failed to uninstall module",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (err) {
		console.error("[modules] Error uninstalling module:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
