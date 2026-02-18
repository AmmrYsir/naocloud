/**
 * Security module manifest - RBAC and User Management
 * This is a critical module that cannot be disabled
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "security",
	name: "Security",
	version: "1.0.0",
	description: "RBAC, user management, and security settings",
	type: "core",

	navItems: [
		{
			id: "users",
			label: "Users",
			href: "/users",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
			group: "Admin",
			order: 1,
			requiredPermission: "admin",
		},
	],

	pages: [
		{
			route: "/users",
			component: "../../pages/users.astro",
			title: "User Management",
			description: "Manage users and roles",
			requiredPermission: "admin",
		},
	],

	apiRoutes: [
		{
			path: "/users",
			method: "GET",
			handler: "./api/users.ts",
			requiredPermission: "admin",
		},
		{
			path: "/users",
			method: "POST",
			handler: "./api/users.ts",
			requiredPermission: "admin",
		},
		{
			path: "/users/:username",
			method: "PUT",
			handler: "./api/user.ts",
			requiredPermission: "admin",
		},
		{
			path: "/users/:username",
			method: "DELETE",
			handler: "./api/user.ts",
			requiredPermission: "admin",
		},
		{
			path: "/password",
			method: "POST",
			handler: "./api/password.ts",
		},
		{
			path: "/permissions",
			method: "GET",
			handler: "./api/permissions.ts",
		},
	],

	// This module cannot be disabled
	canDisable: false,
	sandbox: {
		allowedCommands: [],
	},
};

export default manifest;
