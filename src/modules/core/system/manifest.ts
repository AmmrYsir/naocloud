/**
 * System module manifest
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "system",
	name: "System",
	version: "1.0.0",
	description: "Server hardware and OS information",
	type: "core",

	navItems: [
		{
			id: "system",
			label: "System",
			href: "/system",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>`,
		},
	],

	pages: [
		{
			route: "/system",
			component: "../../pages/system.astro",
			title: "System",
			description: "Server hardware and OS information",
		},
	],

	apiRoutes: [
		{
			path: "/info",
			method: "GET",
			handler: "./api/info.ts",
		},
	],
};

export default manifest;
