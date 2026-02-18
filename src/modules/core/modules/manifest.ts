/**
 * Modules module manifest - Module management
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "modules",
	name: "Modules",
	version: "1.0.0",
	description: "Manage built-in and external modules",
	type: "core",

	navItems: [
		{
			id: "modules",
			label: "Modules",
			href: "/modules",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
			group: "Admin",
			order: 4,
			requiredPermission: "admin",
		},
	],

	pages: [
		{
			route: "/modules",
			component: "../../pages/modules.astro",
			title: "Modules",
			description: "Manage built-in and external modules",
			requiredPermission: "admin",
		},
	],
};

export default manifest;
