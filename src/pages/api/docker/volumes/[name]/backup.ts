/**
 * Volume Backup API - POST /api/docker/volumes/:name/backup
 * Backup a Docker volume to a tar archive
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { logAction } from "../../../../../lib/audit";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export const POST: APIRoute = async ({ cookies, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const volumeName = params.name;
	if (!volumeName) {
		return new Response(JSON.stringify({ error: "Volume name required" }), { status: 400 });
	}

	try {
		// Create backups directory if it doesn't exist
		const backupDir = path.join(process.cwd(), "data", "backups", "volumes");
		if (!fs.existsSync(backupDir)) {
			fs.mkdirSync(backupDir, { recursive: true });
		}

		// Create backup filename with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupFile = path.join(backupDir, `${volumeName}-${timestamp}.tar.gz`);

		// Create a temporary container to backup the volume
		execFileSync(
			"docker",
			[
				"run",
				"--rm",
				"-v",
				`${volumeName}:/data:ro`,
				"-v",
				`${backupDir}:/backup`,
				"alpine",
				"tar",
				"czf",
				`/backup/${volumeName}-${timestamp}.tar.gz`,
				"-C",
				"/data",
				".",
			],
			{ encoding: "utf-8", timeout: 120000 }
		);

		logAction(user.username, "VOLUME_BACKUP", volumeName, `Backup created: ${backupFile}`);

		return new Response(
			JSON.stringify({
				ok: true,
				message: "Volume backed up successfully",
				backupFile: `${volumeName}-${timestamp}.tar.gz`,
				path: backupFile,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error backing up volume:", err);
		return new Response(
			JSON.stringify({
				error: "Backup failed",
				message: err.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
