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

## Testing

Tests are not currently set up. When adding tests, use Vitest:
```bash
npm install -D vitest
npx vitest run src/lib/utils.test.ts      # Run specific file
npx vitest run --grep "pattern"           # Run matching tests
npx vitest watch src/test.ts              # Watch mode
```

## Linting

No linting is currently configured. Consider adding ESLint:
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

## TailwindCSS

Uses TailwindCSS v4 with `@tailwindcss/vite`. Apply styles via utility classes:
```tsx
export default function Button({ children, variant = "primary" }: Props) {
  const base = "px-4 py-2 rounded font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  };
  return <button className={`${base} ${variants[variant]}`}>{children}</button>;
}
```

## Database

Uses `better-sqlite3` for SQLite. Database file at `./data/naocloud.db`:
```typescript
import Database from "better-sqlite3";

const db = new Database("./data/naocloud.db");

const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const user = stmt.get(userId);
```

Always use parameterized queries — never string interpolation.

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
