# Agent Guidelines for ServerPilot

This document provides guidelines for AI agents working on the ServerPilot codebase.

## Project Overview

ServerPilot is a local-first server management dashboard built with **Astro**, **React**, and **TailwindCSS**. It uses server-side rendering (SSR) with a Node.js adapter.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run astro` | Run Astro CLI (e.g., `npx astro add`) |

### Running the Production Server

After building, run the standalone server:
```bash
node dist/server/entry.mjs
```

## TypeScript Configuration

- Uses Astro's strict TypeScript config (`astro/tsconfigs/strict`)
- JSX: `react-jsx` with `react` import source
- All `.ts`/`.tsx` files must be type-safe
- Use `any` sparingly - prefer explicit types

## Code Style Guidelines

### File Naming

| Type | Extension | Example |
|------|-----------|---------|
| React components | `.jsx` or `.tsx` | `Chart.tsx`, `ContainerCard.jsx` |
| TypeScript utilities | `.ts` | `auth.ts`, `utils.ts` |
| Astro pages/layouts | `.astro` | `index.astro`, `Layout.astro` |
| API endpoints | `.ts` | `login.ts`, `containers.ts` |

### Imports Organization

Order imports by:
1. Standard library (`crypto`, `fs`, etc.)
2. Third-party packages (`astro`, `react`, `jsonwebtoken`)
3. Internal imports (`../lib/`, `./components/`)

```typescript
// Standard library
import path from "path";

// Third-party
import jwt from "jsonwebtoken";
import type { APIRoute } from "astro";

// Internal
import { authenticate, TOKEN_COOKIE } from "../../../lib/auth";
```

### Component Patterns

**React Components** (`src/components/*.jsx`):
- Use functional components with hooks
- Destructure props with defaults
- Use TypeScript interfaces for props

```tsx
interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function Chart({
  data = [],
  color = "#3b82f6",
  height = 40,
}: Props) {
  // component logic
}
```

**Astro Components** (`src/components/*.astro`, `src/pages/*.astro`):
- Use frontmatter `---` for server-side logic
- Use `<Fragment set:html={...} />` for dynamic SVG icons
- Define interfaces in frontmatter for props

```astro
---
interface Props {
  title: string;
}

const { title } = Astro.props;
---
<html>
  <h1>{title}</h1>
</html>
```

### API Routes

Use Astro's `APIRoute` type and export named handlers:

```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request, cookies }) => {
  // handler logic
  return new Response(JSON.stringify({ data: "ok" }), {
    headers: { "Content-Type": "application/json" }
  });
};
```

### Error Handling

- Use try/catch blocks for async operations
- Return appropriate HTTP status codes (400, 401, 403, 500)
- Return JSON error responses:

```typescript
try {
  const result = await riskyOperation();
  return new Response(JSON.stringify({ data: result }), { status: 200 });
} catch (err) {
  console.error("[endpoint] Error:", err);
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
}
```

### Naming Conventions

- **Files**: kebab-case (`container-card.jsx`, `api-handler.ts`)
- **Functions**: camelCase (`formatBytes`, `getContainers`)
- **Types/Interfaces**: PascalCase (`User`, `ApiResponse<T>`)
- **Constants**: UPPER_SNAKE_CASE (`TOKEN_COOKIE`, `MAX_RETRIES`)
- **React Components**: PascalCase (export default)

### Type Definitions

Define interfaces at module level for reuse:

```typescript
export interface User {
  username: string;
  role: "admin" | "viewer";
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}
```

### CSS/Tailwind

- Use Tailwind utility classes in components
- Use semantic class names in Astro templates
- Custom theme tokens defined in `src/styles/global.css`

### Documentation

Add JSDoc comments for:
- File-level purpose
- Exported functions (especially API handlers)
- Complex utility functions

```typescript
/**
 * Format bytes to human-readable string.
 * @param bytes - Size in bytes
 * @param decimals - Decimal places (default: 1)
 */
export function formatBytes(bytes: number, decimals = 1): string { ... }
```

## Project Structure

```
src/
├── components/     # React islands + Astro components
├── layouts/         # Astro layouts
├── lib/             # Shared utilities (auth, api, utils)
├── modules/         # Module system
│   ├── core/        # Built-in core modules
│   │   ├── docker/
│   │   ├── system/
│   │   └── settings/
│   ├── types.ts     # Module type definitions
│   ├── registry.ts  # Module registry
│   ├── loader.ts    # Module loader
│   └── sandbox.ts   # Module sandbox utilities
├── pages/           # Astro pages + API routes
│   └── api/        # API endpoints
└── styles/         # Global CSS + Tailwind
```

## Module System

ServerPilot uses a modular architecture. There are two types of modules:

| Type | Description | Location |
|------|-------------|----------|
| **Core** | Built-in modules bundled with the app | `src/modules/core/` |
| **External** | Third-party npm packages | `node_modules/serverpilot-module-*/` |

### Creating a Core Module

1. Create directory in `src/modules/core/<module-id>/`
2. Create `manifest.ts` with module definition

```typescript
// src/modules/core/my-module/manifest.ts
import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
  id: "my-module",
  name: "My Module",
  version: "1.0.0",
  description: "Module description",
  type: "core",
  
  navItems: [
    { id: "my-module", label: "My Module", href: "/my-module", icon: "..." }
  ],
  
  pages: [
    { route: "/my-module", component: "./MyPage.astro", title: "My Module" }
  ],
  
  apiRoutes: [
    { path: "/data", method: "GET", handler: "./api/data.ts" }
  ],
};

export default manifest;
```

### Module API Routes

Module API endpoints are accessed at:
```
/api/modules/:moduleId/:path
```

Example: `/api/modules/settings/` or `/api/modules/system/info`

### Module Types

See `src/modules/types.ts` for complete type definitions:
- `ModuleManifest` - Module configuration
- `NavItem` - Navigation items
- `ModulePage` - Page definitions
- `ModuleWidget` - Dashboard widgets
- `ModuleApiRoute` - API route definitions

## Adding New Features

1. **New API endpoint**: Add file in `src/pages/api/`
2. **New page**: Add Astro file in `src/pages/`
3. **New React component**: Add in `src/components/`
4. **New utility**: Add to `src/lib/`

## Security Guidelines

Security is critical for a server management dashboard. The following measures are implemented and must NOT be regressed.

### Hardened (Do Not Regress)

| Area | Implementation |
|------|----------------|
| Command execution | Use `execFileSync`/`execFile` with argument arrays — never shell string interpolation |
| JWT secret | Never use default secrets; reject production startup without `JWT_SECRET` |
| LAN-only access | All `/api/` routes enforced via middleware (`src/middleware.ts`) |
| Rate limiting | Login endpoint has 5 attempts/IP/60s limit |
| Error messages | Never expose `err.message` to clients — return generic "Internal server error" |
| Auth cookie | Use `httpOnly: true`, set `secure: true` behind HTTPS |
| CSRF | Logout is POST-only, not GET |

### Security Best Practices

When writing new code:
- **Never expose secrets** in responses or client-side code
- Use `httpOnly` cookies for JWT tokens
- Validate all inputs from `request.json()`
- Use parameterized commands (avoid shell injection)
- Log errors server-side only, never leak to clients

### Security Checklist for New Code

Before submitting changes:
- [ ] No shell commands — use argument arrays with `execFile`/`execFileSync`
- [ ] No secrets in responses or client-side code
- [ ] All user inputs validated and sanitized
- [ ] Error messages are generic, not exposing internals
- [ ] Proper HTTP status codes (400, 401, 403, 500)
- [ ] JWT tokens use `httpOnly` cookies

## Recommended Roadmap Priorities

See `ROADMAP.md` for a detailed feature checklist organized by phase:

- **Phase 1**: Security Hardening (2FA, RBAC, API keys, audit logging)
- **Phase 2**: Docker Enhancements (resource limits, compose, terminal)
- **Phase 3**: Developer Experience (web terminal, file manager, API docs)
- **Phase 4**: Monitoring & Observability (historical metrics, alerts)
- **Phase 5**: UI/UX Improvements (command palette, i18n, theming)
- **Phase 6**: Data & Backup (volume backup, config versioning)
- **Phase 7**: Automation (cron, webhooks, batch operations)

### Quick Priority List

When planning new features, consider these high-impact areas:

1. **Security**: 2FA, RBAC with custom roles, API key management, audit logging
2. **Docker**: Resource limits management, Docker Compose UI, container health checks, web terminal
3. **Monitoring**: Historical metrics with time-series graphs
4. **Developer Experience**: Web-based terminal (xterm.js), REST API with OpenAPI
5. **UI/UX**: Command palette (Cmd+K), customizable dashboard widgets

## Environment Variables

Create `.env` in project root:
```
JWT_SECRET=your-random-secret-here
```

## Testing

No test framework is currently configured. When adding tests:
- Use Vitest for unit tests
- Place tests adjacent to source files (`utils.ts` → `utils.test.ts`)
