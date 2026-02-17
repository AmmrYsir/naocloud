/**
 * Volume Restore API - POST /api/docker/volumes/:name/restore
 * Restore a Docker volume from a tar archive
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { logAction } from "../../../../../lib/audit";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export const POST: APIRoute = async ({ cookies, params, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const volumeName = params.name;
	if (!volumeName) {
		return new Response(JSON.stringify({ error: "Volume name required" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { backupFile } = body;

		if (!backupFile) {
			return new Response(JSON.stringify({ error: "Backup file required" }), { status: 400 });
		}

		const backupDir = path.join(process.cwd(), "data", "backups", "volumes");
		const backupPath = path.join(backupDir, backupFile);

		// Verify backup file exists
		if (!fs.existsSync(backupPath)) {
			return new Response(
				JSON.stringify({ error: "Backup file not found" }),
				{ status: 404 }
			);
		}

		// Create volume if it doesn't exist
		try {
			execFileSync("docker", ["volume", "inspect", volumeName], {
				encoding: "utf-8",
				timeout: 10000,
			});
		} catch {
			// Volume doesn't exist, create it
			execFileSync("docker", ["volume", "create", volumeName], {
				encoding: "utf-8",
				timeout: 10000,
			});
		}

		// Restore the volume using a temporary container
		execFileSync(
			"docker",
			[
				"run",
				"--rm",
				"-v",
				`${volumeName}:/data`,
				"-v",
				`${backupPath}:/backup.tar.gz:ro`,
				"alpine",
				"sh",
				"-c",
				"cd /data && rm -rf * && tar xzf /backup.tar.gz",
			],
			{ encoding: "utf-8", timeout: 120000 }
		);

		logAction(user.username, "VOLUME_RESTORE", volumeName, `Restored from: ${backupFile}`);

		return new Response(
			JSON.stringify({
				ok: true,
				message: "Volume restored successfully",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error restoring volume:", err);
		return new Response(
			JSON.stringify({
				error: "Restore failed",
				message: err.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
