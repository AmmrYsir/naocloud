/**
 * GET /api/docker/images – Lists all Docker images.
 */
import type { APIRoute } from "astro";
import { runSync } from "../../../lib/exec";
import { getUserFromCookies } from "../../../lib/auth";

export const GET: APIRoute = async ({ cookies }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	try {
		const result = runSync("docker:images", [], 15000);
		if (!result.ok) {
			return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
		}

		const images = result.stdout
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try {
					const img = JSON.parse(line);
					return {
						Id: img.ID,
						RepoTags: [`${img.Repository}:${img.Tag}`],
						Size: parseSize(img.Size || "0"),
						Created: img.CreatedAt,
					};
				} catch { return null; }
			})
			.filter(Boolean);

		return new Response(JSON.stringify(images), { status: 200, headers: { "Content-Type": "application/json" } });
	} catch {
		return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
	}
};

function parseSize(sizeStr: string): number {
	const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
	if (!match) return 0;
	const val = parseFloat(match[1]);
	const unit = match[2].toUpperCase();
	const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
	return val * (multipliers[unit] || 1);
}
