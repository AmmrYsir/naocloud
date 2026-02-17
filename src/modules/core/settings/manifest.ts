/**
 * Settings module manifest
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "settings",
	name: "Settings",
	version: "1.0.0",
	description: "Application configuration and preferences",
	type: "core",

	navItems: [
		{
			id: "settings",
			label: "Settings",
			href: "/settings",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
		},
	],

	pages: [
		{
			route: "/settings",
			component: "../../pages/settings.astro",
			title: "Settings",
			description: "Application configuration and preferences",
		},
	],

	apiRoutes: [
		{
			path: "/",
			method: "GET",
			handler: "./api/index.ts",
		},
		{
			path: "/",
			method: "POST",
			handler: "./api/index.ts",
		},
		{
			path: "/export",
			method: "GET",
			handler: "./api/export.ts",
		},
		{
			path: "/import",
			method: "POST",
			handler: "./api/import.ts",
		},
	],
};

export default manifest;
