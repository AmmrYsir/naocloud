/**
 * Module API router - handles /api/modules/:moduleId/*
 * Routes requests to the appropriate module's API handler
 */
import type { APIRoute } from "astro";
import type { ModuleApiRoute } from "../../../../modules/types";
import { getModule, getApiRoutes } from "../../../../modules/registry";

export const ALL: APIRoute = async ({ params, request }) => {
	const moduleId = params.moduleId;
	const path = params.path ?? "";

	if (!moduleId) {
		return new Response(JSON.stringify({ error: "Module ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const module = getModule(moduleId);

	if (!module) {
		return new Response(
			JSON.stringify({
				error: `Module "${moduleId}" not found`,
				message: `The module "${moduleId}" is not installed or disabled.`,
			}),
			{ status: 404, headers: { "Content-Type": "application/json" } }
		);
	}

	if (!module.enabled) {
		return new Response(
			JSON.stringify({
				error: `Module "${moduleId}" is disabled`,
				message: "Enable the module in settings to use this API.",
			}),
			{ status: 403, headers: { "Content-Type": "application/json" } }
		);
	}

	// Find matching API route
	const routes = getApiRoutes(moduleId);
	const method = request.method as "GET" | "POST" | "PUT" | "DELETE";

	const route = routes?.find((r: ModuleApiRoute) => r.path === path && r.method === method);

	if (!route) {
		return new Response(
			JSON.stringify({
				error: "Route not found",
				message: `No ${method} handler for /api/modules/${moduleId}/${path}`,
			}),
			{ status: 404, headers: { "Content-Type": "application/json" } }
		);
	}

	try {
		// Dynamic import of the handler
		const handlerModule = await import(route.handler);
		const handler = handlerModule[method];

		if (!handler) {
			return new Response(
				JSON.stringify({ error: "Handler not found" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Call the handler with the request context
		return handler({ params: { ...params, moduleId }, request });
	} catch (err) {
		console.error(`[modules] Error in ${moduleId}/${path}:`, err);

		// Check if it's a version incompatibility error
		if (err instanceof Error && err.message.includes("Cannot find module")) {
			return new Response(
				JSON.stringify({
					error: "Module version incompatible",
					message: `This module may be outdated or incompatible with the current ServerPilot version.`,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		return new Response(
			JSON.stringify({ error: "Internal server error" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
