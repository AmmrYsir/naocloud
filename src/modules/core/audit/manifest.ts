/**
 * Audit module manifest - Audit logging
 * This is a critical module that cannot be disabled
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "audit",
	name: "Audit",
	version: "1.0.0",
	description: "Audit logging for all admin actions",
	type: "core",

	navItems: [
		{
			id: "audit",
			label: "Audit Logs",
			href: "/audit",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`,
			requiredPermission: "admin",
		},
	],

	pages: [
		{
			route: "/audit",
			component: "../../pages/audit.astro",
			title: "Audit Logs",
			description: "View and export audit logs",
			requiredPermission: "admin",
		},
	],

	apiRoutes: [
		{
			path: "/logs",
			method: "GET",
			handler: "./api/logs.ts",
			requiredPermission: "admin",
		},
		{
			path: "/export",
			method: "GET",
			handler: "./api/export.ts",
			requiredPermission: "admin",
		},
	],

	// This module cannot be disabled
	canDisable: false,
	sandbox: {
		allowedCommands: [],
	},
};

export default manifest;
