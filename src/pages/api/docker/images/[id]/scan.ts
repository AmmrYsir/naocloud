/**
 * Image Scan API - POST /api/docker/images/:id/scan
 * Scan a Docker image for vulnerabilities using Trivy
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { logAction, LOG_LEVELS, ERROR_CODES } from "../../../../../lib/audit";
import { execFileSync } from "child_process";

export const POST: APIRoute = async ({ cookies, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const imageId = params.id;
	if (!imageId) {
		return new Response(JSON.stringify({ error: "Image ID required" }), { status: 400 });
	}

	try {
		// Check if trivy is installed
		try {
			execFileSync("which", ["trivy"], { encoding: "utf-8" });
		} catch {
			logAction(
				user.username,
				"IMAGE_SCAN",
				imageId,
				"Trivy not installed",
				undefined,
				{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
			);
			return new Response(
				JSON.stringify({
					error: "Trivy not installed",
					message: "Trivy is required for image scanning. Install it with: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin",
					code: ERROR_CODES.ERR_INTERNAL,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Run trivy scan
		const result = execFileSync(
			"trivy",
			[
				"image",
				"--format",
				"json",
				"--severity",
				"HIGH,CRITICAL",
				imageId,
			],
			{ encoding: "utf-8", timeout: 300000 } // 5 minute timeout for large images
		);

		const scanResult = JSON.parse(result);

		// Count vulnerabilities
		let highCount = 0;
		let criticalCount = 0;

		if (scanResult.Results) {
			for (const resultItem of scanResult.Results) {
				if (resultItem.Vulnerabilities) {
					for (const vuln of resultItem.Vulnerabilities) {
						if (vuln.Severity === "HIGH") highCount++;
						if (vuln.Severity === "CRITICAL") criticalCount++;
					}
				}
			}
		}

		logAction(
			user.username,
			"IMAGE_SCAN",
			imageId,
			`Scan completed: ${highCount} high, ${criticalCount} critical vulnerabilities`,
			undefined,
			{ level: LOG_LEVELS.INFO, code: "INF004" }
		);

		return new Response(
			JSON.stringify({
				ok: true,
				imageId,
				scan: scanResult,
				summary: {
					high: highCount,
					critical: criticalCount,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		const errorMsg = err instanceof Error ? err.message : "Unknown error";
		logAction(
			user.username,
			"IMAGE_SCAN",
			imageId,
			`Scan failed: ${errorMsg}`,
			undefined,
			{ level: LOG_LEVELS.ERROR, code: ERROR_CODES.ERR_INTERNAL }
		);
		console.error("[docker] Error scanning image:", err);
		return new Response(
			JSON.stringify({
				error: "Scan failed",
				message: errorMsg,
				code: ERROR_CODES.ERR_INTERNAL,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
