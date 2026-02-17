/**
 * Container Resources API - GET/POST /api/docker/container/:id/resources
 * Get or update container resource limits
 */
import type { APIRoute } from "astro";
import { getUserFromCookies } from "../../../../../lib/auth";
import { logAction } from "../../../../../lib/audit";
import { execFileSync } from "child_process";

export const GET: APIRoute = async ({ cookies, params }) => {
	const user = getUserFromCookies(cookies);
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Container ID required" }), { status: 400 });
	}

	try {
		// Get container stats
		const stats = execFileSync(
			"docker",
			["stats", "--no-stream", "--format", "{{.CPUPerc}}|{{.MemUsage}}|{{.MemLimit}}|{{.NetIO}}|{{.BlockIO}}", id],
			{ encoding: "utf-8", timeout: 10000 }
		);

		// Get container inspect for resource limits
		const inspect = execFileSync(
			"docker",
			["inspect", "--format", "{{json .HostConfig}}", id],
			{ encoding: "utf-8", timeout: 10000 }
		);

		const hostConfig = JSON.parse(inspect);

		return new Response(
			JSON.stringify({
				id,
				stats: stats.trim(),
				limits: {
					cpu: hostConfig.NanoCpus ? hostConfig.NanoCpus / 1000000000 : null,
					memory: hostConfig.Memory,
					memorySwap: hostConfig.MemorySwap,
					cpusetCpus: hostConfig.CpusetCpus,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error getting container resources:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to get container resources",
				message: err.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};

export const POST: APIRoute = async ({ cookies, params, request }) => {
	const user = getUserFromCookies(cookies);
	if (!user || user.role !== "admin") {
		return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
	}

	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Container ID required" }), { status: 400 });
	}

	try {
		const body = await request.json();
		const { cpu, memory, memorySwap } = body;

		// Build update command
		const args = ["update"];

		if (cpu !== undefined) {
			args.push("--cpus", cpu.toString());
		}
		if (memory !== undefined) {
			args.push("--memory", memory.toString());
		}
		if (memorySwap !== undefined) {
			args.push("--memory-swap", memorySwap.toString());
		}

		args.push(id);

		execFileSync("docker", args, { encoding: "utf-8", timeout: 30000 });

		logAction(user.username, "UPDATE_CONTAINER_RESOURCES", id, `Updated resources: CPU=${cpu}, Memory=${memory}`);

		return new Response(
			JSON.stringify({ ok: true, message: "Container resources updated" }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (err: any) {
		console.error("[docker] Error updating container resources:", err);
		return new Response(
			JSON.stringify({
				error: "Failed to update container resources",
				message: err.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
