/**
 * Service module manifest - Linux service management
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "service",
	name: "Services",
	version: "1.0.0",
	description: "Linux service management with logs and configuration",
	type: "core",

	navItems: [
		{
			id: "services",
			label: "Services",
			href: "/services",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
		},
	],

	pages: [
		{
			route: "/services",
			component: "../../pages/services.astro",
			title: "Services",
			description: "Manage Linux services, view logs, and edit configurations",
		},
	],

	apiRoutes: [
		{
			path: "/list",
			method: "GET",
			handler: "./api/list.ts",
		},
		{
			path: "/status",
			method: "GET",
			handler: "./api/status.ts",
		},
		{
			path: "/action",
			method: "POST",
			handler: "./api/action.ts",
		},
		{
			path: "/logs",
			method: "GET",
			handler: "./api/logs.ts",
		},
		{
			path: "/config",
			method: "GET",
			handler: "./api/config.ts",
		},
		{
			path: "/config",
			method: "POST",
			handler: "./api/config.ts",
		},
	],

	sandbox: {
		allowedCommands: ["systemctl", "journalctl", "cat", "ls"],
		timeout: 30000,
	},
};

export default manifest;
