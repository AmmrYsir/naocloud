/**
 * GET /api/docker/containers – Lists all Docker containers.
 * Uses Docker CLI with JSON formatting for reliable parsing.
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
		// Use docker ps with JSON format
		const result = runSync("docker:ps", [], 15000);

		if (!result.ok) {
			return new Response(JSON.stringify([]), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		const containers = result.stdout
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try {
					const c = JSON.parse(line);
					// Normalize into structure ContainerCard expects
					return {
						Id: c.ID,
						Names: [`/${c.Names}`],
						Image: c.Image,
						State: c.State?.toLowerCase(),
						Status: c.Status,
						Ports: parsePorts(c.Ports || ""),
						Created: c.CreatedAt,
					};
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		return new Response(JSON.stringify(containers), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify([]), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}
};

function parsePorts(portStr: string) {
	if (!portStr) return [];
	return portStr.split(",").map((p) => {
		const match = p.trim().match(/(?:(\d+\.\d+\.\d+\.\d+):)?(\d+)->(\d+)\/(\w+)/);
		if (match) {
			return {
				IP: match[1] || "0.0.0.0",
				PublicPort: parseInt(match[2]),
				PrivatePort: parseInt(match[3]),
				Type: match[4],
			};
		}
		return null;
	}).filter(Boolean);
}
