/**
 * Docker module manifest
 */

import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
	id: "docker",
	name: "Docker",
	version: "1.0.0",
	description: "Container management and orchestration",
	type: "core",

	navItems: [
		{
			id: "docker",
			label: "Docker",
			href: "/docker",
			icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 8c-1.45 0-2.26.15-3 .5-1.12-1.28-2.7-2-4.5-2h-3c-1.8 0-3.38.72-4.5 2C5.26 8.15 4.45 8 3 8c-1 0-1 2 0 2 .6 0 1 .1 1.4.3C4.15 11.4 4 12.6 4 14c0 3.32 2.68 6 6 6h4c3.32 0 6-2.68 6-6 0-1.4-.15-2.6-.4-3.7.4-.2.8-.3 1.4-.3 1 0 1-2 0-2z"/></svg>`,
		},
	],

	pages: [
		{
			route: "/docker",
			component: "../../pages/docker.astro",
			title: "Docker",
			description: "Container management and orchestration",
		},
	],

	apiRoutes: [
		{
			path: "/containers",
			method: "GET",
			handler: "../../pages/api/docker/containers.ts",
		},
		{
			path: "/images",
			method: "GET",
			handler: "../../pages/api/docker/images.ts",
		},
		{
			path: "/volumes",
			method: "GET",
			handler: "../../pages/api/docker/volumes.ts",
		},
		{
			path: "/networks",
			method: "GET",
			handler: "../../pages/api/docker/networks.ts",
		},
		{
			path: "/logs",
			method: "GET",
			handler: "../../pages/api/docker/logs.ts",
		},
		{
			path: "/container/start",
			method: "POST",
			handler: "../../pages/api/docker/container/[action].ts",
		},
		{
			path: "/container/stop",
			method: "POST",
			handler: "../../pages/api/docker/container/[action].ts",
		},
		{
			path: "/container/restart",
			method: "POST",
			handler: "../../pages/api/docker/container/[action].ts",
		},
		{
			path: "/container/remove",
			method: "POST",
			handler: "../../pages/api/docker/container/[action].ts",
		},
	],

	sandbox: {
		allowedCommands: ["docker", "docker-compose"],
		timeout: 30000,
	},
};

export default manifest;
