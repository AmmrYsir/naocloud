/**
 * POST /api/modules/install - Install an external module
 * 
 * This adds the npm package to package.json and runs npm install
 */
import type { APIRoute } from "astro";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export const POST: APIRoute = async ({ request }) => {
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
			return new Response(
				JSON.stringify({
					error: "Invalid package name",
					message: "External modules must be named with 'serverpilot-module-' prefix",
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
			return new Response(
				JSON.stringify({
					error: "Package already installed",
					message: `${packageName} is already in your dependencies`,
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
			console.error(`[modules] Failed to install ${packageName}:`, installErr);
			return new Response(
				JSON.stringify({
					error: "Installation failed",
					message: installErr instanceof Error ? installErr.message : "Failed to install module",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (err) {
		console.error("[modules] Error installing module:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
