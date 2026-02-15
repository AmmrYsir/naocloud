## Security Audit & Hardening Checklist

The following security findings were identified during an internal audit. Items marked **[FIXED]** have been addressed in the codebase.

### Critical

| # | Finding | Status |
|---|---------|--------|
| 1 | **Command injection via prefix whitelist** – `exec.ts` used `startsWith` prefix matching + shell string interpolation. An attacker who controlled any argument could chain commands (`; rm -rf /`). | **[FIXED]** Replaced with `execFileSync`/`execFile` + argument arrays (no shell). Command registry uses exact binaries + static args. |
| 2 | **Hardcoded JWT secret fallback** – Default secret `serverpilot-dev-secret-change-me` was used when `JWT_SECRET` env var was missing. | **[FIXED]** Server now refuses to start in production without `JWT_SECRET` set. |
| 3 | **Hardcoded admin/admin credentials** – Default user with no change mechanism. | Documented — change credentials in `src/lib/auth.ts` before deployment. |
| 4 | **`isLocalNetwork()` never enforced** – Function existed but was never called. | **[FIXED]** Added Astro middleware enforcing LAN-only access on all `/api/` routes. |

### High

| # | Finding | Status |
|---|---------|--------|
| 5 | **No login rate limiting** – Brute-force attacks possible against `/api/auth/login`. | **[FIXED]** In-memory rate limiter: 5 attempts per IP per 60 seconds. |
| 6 | **`JWT_SECRET` exported** – Module exported the secret, allowing any importing module to read it. | **[FIXED]** Removed from exports. |
| 7 | **Error messages leak internals** – `err.message` returned in JSON responses across all API endpoints. | **[FIXED]** All catch blocks now return generic `"Internal server error"`. |
| 8 | **Docker logs endpoint leaks stderr** – `/api/docker/logs` returned `result.stderr` as log content. | **[FIXED]** Returns safe "No logs available" fallback instead. |

### Medium

| # | Finding | Status |
|---|---------|--------|
| 9 | **CSRF on logout** – `GET /api/auth/logout` allowed cross-site logout via image/link tags. | **[FIXED]** Removed GET handler; logout is POST-only. UI updated to use form POST. |
| 10 | **`secure: false` on cookie** – Auth cookie sent over HTTP. | Documented — set `secure: true` when using HTTPS (reverse proxy). |
| 11 | **`bcrypt.hashSync` at module load** – Blocks the event loop on first import. | **[FIXED]** Pre-computed hash constant used instead. |
| 12 | **Dots in container ID sanitization** – Regex allowed `.` which is valid but unusual. | Acceptable for Docker naming. |
| 13 | **No request body size limits** – Large payloads could cause memory issues. | Mitigated by LAN-only middleware + reverse proxy recommendation. |

### Low

| # | Finding | Status |
|---|---------|--------|
| 14 | **`172.2x`/`172.3x` IP range too broad** – `isLocalNetwork()` matched non-RFC1918 addresses. | **[FIXED]** Corrected to exact RFC 1918 range `172.16.0.0/12`. |
| 15 | **No security headers** – Missing CSP, X-Frame-Options, X-Content-Type-Options. | **[FIXED]** Added via Astro middleware on all responses. |

### Remaining Recommendations

- Replace hardcoded user store with a config file or SQLite database
- Add password change endpoint
- Enable `secure: true` on cookies when deploying behind HTTPS
- Implement CSRF tokens for all state-changing POST endpoints
- Add audit logging for admin actions