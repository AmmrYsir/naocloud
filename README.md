# ServerPilot

A local-first, lightweight server management dashboard built with **Astro**, **TailwindCSS**, and **React** component islands.

## Features (MVP)

- **Real-time System Overview** – CPU, RAM, disk usage, uptime, load average, network I/O
- **Docker Management** – List containers/images/volumes/networks, start/stop/restart/remove with confirmation modals, container logs
- **Service Control** – Toggle systemd services (nginx, ssh, ufw, docker) via the dashboard
- **Authentication** – Local JWT auth with bcrypt password hashing, cookie-based sessions
- **Dark/Light Theme** – Toggle with persistent preference (localStorage)
- **Mobile-First UI** – Responsive grid, collapsible sidebar to bottom nav on mobile
- **PWA Support** – Installable progressive web app manifest
- **Settings** – Hostname/timezone configuration, config export/import as JSON
- **Role-Based Access** – Admin/viewer roles (admin required for write actions)

## Project Structure

```
├── astro.config.mjs          # Astro config (SSR + Node adapter)
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   └── manifest.json         # PWA manifest
└── src/
    ├── components/
    │   ├── Chart.jsx          # Sparkline/mini-chart (React island)
    │   ├── ContainerCard.jsx  # Docker container card with actions (React)
    │   ├── DashboardStats.jsx # Auto-refreshing system stats panel (React)
    │   ├── DockerList.jsx     # Docker resource tabs + listing (React)
    │   ├── Navbar.astro       # Top navigation bar
    │   ├── ServiceToggle.jsx  # Systemd service toggle switch (React)
    │   ├── Sidebar.astro      # Side nav (desktop) + bottom nav (mobile)
    │   └── StatCard.astro     # Static stat card with progress bar
    ├── layouts/
    │   └── BaseLayout.astro   # Base HTML layout with Tailwind
    ├── lib/
    │   ├── api.ts             # Client-side fetch helpers
    │   ├── auth.ts            # JWT authentication (server-side)
    │   ├── exec.ts            # Centralized, whitelisted command execution
    │   └── utils.ts           # Shared utility functions
    ├── pages/
    │   ├── index.astro        # Dashboard (system overview + services)
    │   ├── docker.astro       # Docker container management
    │   ├── system.astro       # Server hardware/OS info
    │   ├── settings.astro     # Configuration & backup
    │   ├── login.astro        # Login page
    │   └── api/
    │       ├── system.ts              # GET system stats
    │       ├── docker.ts              # GET/POST docker overview
    │       ├── docker/
    │       │   ├── containers.ts      # GET containers list
    │       │   ├── images.ts          # GET images list
    │       │   ├── volumes.ts         # GET volumes list
    │       │   ├── networks.ts        # GET networks list
    │       │   ├── logs.ts            # GET container logs
    │       │   └── container/
    │       │       └── [action].ts    # POST start/stop/restart/remove
    │       ├── auth/
    │       │   ├── login.ts           # POST login
    │       │   └── logout.ts          # GET/POST logout
    │       ├── services/
    │       │   ├── status.ts          # GET service status
    │       │   └── [action].ts        # POST start/stop/restart
    │       └── settings/
    │           ├── index.ts           # GET/POST settings
    │           ├── export.ts          # GET config export
    │           └── import.ts          # POST config import
    └── styles/
        └── global.css         # Tailwind + custom theme tokens
```

## Setup

### Prerequisites

- **Node.js** 18+ (or Bun)
- **Linux server** (for system commands — safe fallbacks on other OS)
- **Docker** installed (for container management features)

### Installation

```bash
# Clone or create the project
git clone <repo-url> serverpilot
cd serverpilot

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build

# Run production server
node dist/server/entry.mjs
```

### Environment Variables

| Variable     | Default                            | Description            |
| ------------ | ---------------------------------- | ---------------------- |
| `JWT_SECRET` | `serverpilot-dev-secret-change-me` | Secret for JWT signing |
| `HOST`       | `0.0.0.0`                          | Server bind address    |
| `PORT`       | `3000`                             | Server port            |

### Default Credentials

- **Username:** `admin`
- **Password:** `admin`

> Change the default password and JWT_SECRET before deploying!

## API Endpoints

| Method | Endpoint                          | Description                  | Auth     |
| ------ | --------------------------------- | ---------------------------- | -------- |
| POST   | `/api/auth/login`                 | Authenticate & get JWT       | No       |
| GET    | `/api/auth/logout`                | Clear auth cookie            | No       |
| GET    | `/api/system`                     | System stats (CPU/RAM/disk)  | Required |
| GET    | `/api/docker/containers`          | List all containers          | Required |
| GET    | `/api/docker/images`              | List all images              | Required |
| GET    | `/api/docker/volumes`             | List all volumes             | Required |
| GET    | `/api/docker/networks`            | List all networks            | Required |
| GET    | `/api/docker/logs?id=xx&tail=100` | Get container logs           | Required |
| POST   | `/api/docker/container/[action]`  | Start/stop/restart/remove    | Admin    |
| GET    | `/api/services/status?name=xx`    | Check service status         | Required |
| POST   | `/api/services/[action]`          | Start/stop/restart service   | Admin    |
| GET    | `/api/settings`                   | Get server settings          | Required |
| POST   | `/api/settings`                   | Update hostname/timezone     | Admin    |
| GET    | `/api/settings/export`            | Export config as JSON        | Required |
| POST   | `/api/settings/import`            | Import config from JSON      | Admin    |

## Security

- **Command whitelisting** – Only pre-approved system commands can be executed via `exec.ts`
- **Input sanitization** – Container IDs, hostnames, and service names are sanitized
- **JWT auth** – HttpOnly cookies, 24h expiry
- **Role-based access** – Write operations require admin role
- **LAN-only** – Designed for local network use; bind to localhost or reverse proxy

### Recommended: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name serverpilot.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Docker Socket Access

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Or mount with limited permissions
chmod 660 /var/run/docker.sock
```

## Architecture

```
┌──────────────────────────────────────────────┐
│                   Browser                     │
│  (Astro SSR pages + React interactive islands)│
└────────────────────┬─────────────────────────┘
                     │ fetch /api/*
┌────────────────────▼─────────────────────────┐
│              Astro API Routes                 │
│  /api/system, /api/docker/*, /api/services/*  │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│           src/lib/exec.ts                     │
│  Centralized command execution (whitelisted)  │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│         Linux System / Docker CLI             │
│  /proc, free, df, systemctl, docker           │
└──────────────────────────────────────────────┘
```

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

## Future Roadmap

- [ ] Multi-node clustering view
- [ ] Docker Compose stack management UI
- [ ] Container templates marketplace
- [ ] Scheduled backup jobs
- [ ] Alert notifications (email/Telegram)
- [ ] Resource threshold alerts
- [ ] SSL certificate monitoring
- [ ] Update center for OS and containers
- [ ] Reverse proxy manager integration
- [ ] User audit logs
- [ ] Plugin system for extending modules
- [ ] Monaco editor for docker-compose.yml / .env files
- [ ] WebSocket-based live log streaming

## License

MIT
