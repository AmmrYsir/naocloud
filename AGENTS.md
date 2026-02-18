# Agent Guidelines for ServerPilot

ServerPilot is a local-first server management dashboard built with **Astro**, **React**, and **TailwindCSS**. It uses server-side rendering (SSR) with a Node.js adapter.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npx astro check` | Type-check all files |
| `npx astro check --fix` | Auto-fix type errors |

Run tests (when added with Vitest):
```bash
npx vitest run src/lib/utils.test.ts      # Run specific file
npx vitest run --grep "pattern"           # Run matching tests
npx vitest watch src/test.ts              # Watch mode
```

Run production server: `node dist/server/entry.mjs`

## TypeScript

Uses Astro's strict TypeScript config (`astro/tsconfigs/strict`). Use `any` sparingly - prefer explicit types.

## Code Style

### Comments
- **DO NOT ADD comments** unless explicitly requested
- Code should be self-documenting with clear naming
- Exception: JSDoc for public APIs

### File Naming
| Type | Extension | Example |
|------|-----------|---------|
| React components | `.jsx`/`.tsx` | `Chart.tsx`, `ContainerCard.jsx` |
| TypeScript utilities | `.ts` | `auth.ts`, `utils.ts` |
| Astro pages/layouts | `.astro` | `index.astro`, `Layout.astro` |
| API endpoints | `.ts` | `login.ts`, `containers.ts` |

### Imports Order
1. Standard library (`crypto`, `fs`)
2. Third-party (`astro`, `react`, `jsonwebtoken`)
3. Internal (`../lib/`, `./components/`)

### React Components
```tsx
interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function Chart({ data = [], color = "#3b82f6", height = 40 }: Props) {
  // component logic
}
```

### API Routes
```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const result = await riskyOperation();
    return new Response(JSON.stringify({ data: result }), { status: 200 });
  } catch (err) {
    console.error("[endpoint] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
```

### Error Handling
- Use try/catch for async operations
- Return appropriate HTTP status codes (400, 401, 403, 500)
- Never expose `err.message` to clients

### Naming Conventions
- **Files**: kebab-case (`container-card.jsx`)
- **Functions**: camelCase (`formatBytes`)
- **Types/Interfaces**: PascalCase (`User`, `ApiResponse<T>`)
- **Constants**: UPPER_SNAKE_CASE (`TOKEN_COOKIE`)
- **React Components**: PascalCase

## Project Structure
```
src/
├── components/   # React islands + Astro components
├── layouts/      # Astro layouts
├── lib/          # Shared utilities (auth, api, utils)
├── modules/     # Module system (core/, types.ts, registry.ts)
├── pages/       # Astro pages + API routes
└── styles/      # Global CSS + Tailwind
```

## Module System
Two module types: **Core** (`src/modules/core/`) and **External** (npm packages).

Create a core module with `manifest.ts` in `src/modules/core/<module-id>/`:
```typescript
import type { ModuleManifest } from "../../types";

const manifest: ModuleManifest = {
  id: "my-module",
  name: "My Module",
  version: "1.0.0",
  type: "core",
  navItems: [{ id: "my-module", label: "My Module", href: "/my-module", icon: "..." }],
  pages: [{ route: "/my-module", component: "./MyPage.astro", title: "My Module" }],
};

export default manifest;
```

Module API routes: `/api/modules/:moduleId/:path`

## Security Guidelines

Critical for a server management dashboard. Must NOT regress:

| Area | Implementation |
|------|----------------|
| Command execution | Use `execFileSync`/`execFile` with argument arrays — never shell string interpolation |
| JWT secret | Never use default secrets; reject startup without `JWT_SECRET` |
| LAN-only access | All `/api/` routes enforced via middleware (`src/middleware.ts`) |
| Rate limiting | Login: 5 attempts/IP/60s |
| Error messages | Never expose `err.message` to clients |
| Auth cookie | Use `httpOnly: true`, set `secure: true` behind HTTPS |
| CSRF | Logout is POST-only |

Security checklist:
- [ ] No shell commands — use argument arrays with `execFile`/`execFileSync`
- [ ] No secrets in responses or client-side code
- [ ] All user inputs validated and sanitized
- [ ] Error messages are generic, not exposing internals
- [ ] Proper HTTP status codes (400, 401, 403, 500)
- [ ] JWT tokens use `httpOnly` cookies

## Environment Variables
Create `.env` in project root:
```
JWT_SECRET=your-random-secret-here
```
