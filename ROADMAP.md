# ServerPilot Roadmap & Feature Checklist

A prioritized checklist for future development. Check off items as they are completed.

---

## Phase 0: Module System (Foundation)

- [x] Module type definitions (`src/modules/types.ts`)
- [x] Module registry (`src/modules/registry.ts`)
- [x] Module loader (`src/modules/loader.ts`)
- [x] Core modules: System, Settings, Docker
- [x] Nav items integration in Sidebar
- [x] **Module API routing** - `/api/modules/:moduleId/*`
- [x] **Widgets system** - Dashboard widgets from modules
- [x] **Settings integration** - Module settings in settings page
- [x] **External module support** - Ready for `serverpilot-module-*` packages
- [x] **Module sandboxing** - Command whitelist per module
- [x] **Docker module** - Migrate Docker as core module

---

## Phase 1: Security Hardening (High Priority)

### Authentication & Authorization

- [ ] **2FA (TOTP)**
  - [ ] Add TOTP secret generation on user setup
  - [ ] Add QR code display for authenticator apps
  - [ ] Add verification code input on login
  - [ ] Add option to enable/disable 2FA per user
  - [ ] Add recovery codes as backup

- [ ] **Role-Based Access Control (RBAC)**
  - [ ] Define custom roles (e.g., operator, viewer, editor)
  - [ ] Add permission system (create, read, update, delete per resource)
  - [ ] Add role assignment UI in settings
  - [ ] Enforce permissions in API middleware

- [ ] **API Key Management**
  - [ ] Add API key generation UI
  - [ ] Add key expiration settings
  - [ ] Add scoped permissions (read-only, containers-only, etc.)
  - [ ] Add key rotation/regeneration
  - [ ] Document API authentication with keys

- [ ] **Audit Logging**
  - [ ] Log all admin actions (start/stop containers, config changes)
  - [ ] Add audit log viewer UI
  - [ ] Add log export (JSON/CSV)
  - [ ] Include user, timestamp, action, target, IP

- [ ] **CSRF Protection**
  - [ ] Add CSRF token generation
  - [ ] Add token validation on all POST endpoints
  - [ ] Add token refresh mechanism

- [ ] **User Management Improvements**
  - [ ] Replace hardcoded users with config file (`users.json`)
  - [ ] Add user creation/deletion UI
  - [ ] Add password change endpoint
  - [ ] Add password strength validation

---

## Phase 2: Docker Enhancements

### Container Management

- [ ] **Resource Limits UI**
  - [ ] Display current CPU/memory limits
  - [ ] Add form to set CPU quota, memory limit, swap
  - [ ] Add IO weight/limit settings
  - [ ] Apply limits via API

- [ ] **Docker Compose Management**
  - [ ] List compose projects (from docker-compose.yml)
  - [ ] Add compose file editor (Monaco editor)
  - [ ] Add start/stop/restart for compose stacks
  - [ ] Add compose service logs viewer
  - [ ] Add health status for compose services

- [ ] **Container Health Checks**
  - [ ] Display configured healthcheck settings
  - [ ] Show health status in container list
  - [ ] Add UI to configure healthcheck (cmd, interval, timeout)
  - [ ] Trigger manual health check

- [ ] **Container Terminal**
  - [ ] Integrate xterm.js
  - [ ] Add /exec endpoint for shell access
  - [ ] Support /bin/sh and /bin/bash
  - [ ] Add resize support (pty)

- [ ] **Volume Management**
  - [ ] Display volume mount points
  - [ ] Add volume creation UI
  - [ ] Add volume backup (tar archive)
  - [ ] Add volume restore from backup
  - [ ] Add volume inspection (contents)

### Image Management

- [ ] **Image Vulnerability Scanning**
  - [ ] Integrate Trivy for scanning
  - [ ] Display scan results in UI
  - [ ] Add scan on pull option

- [ ] **Private Registry Support**
  - [ ] Add registry credentials management
  - [ ] Support Docker Hub, GHCR, ECR, custom registries
  - [ ] Add pull/push UI

- [ ] **Dockerfile Linter**
  - [ ] Integrate hadolint
  - [ ] Show warnings in UI
  - [ ] Suggest best practices

---

## Phase 3: Developer Experience

### Terminal & File Management

- [ ] **Web Terminal**
  - [ ] xterm.js integration
  - [ ] Server-side shell execution
  - [ ] Multiple terminal tabs
  - [ ] Terminal history per session

- [ ] **File Manager**
  - [ ] Browse container filesystems
  - [ ] Upload files to containers/volumes
  - [ ] Download files from containers
  - [ ] Create/edit/delete files
  - [ ] Syntax-highlighted editor

- [ ] **Log Streaming**
  - [ ] WebSocket-based live logs
  - [ ] Filter by log level
  - [ ] Search within logs
  - [ ] Export logs to file

### API & Integrations

- [ ] **REST API with OpenAPI**
  - [ ] Document all endpoints with OpenAPI 3.0
  - [ ] Add Swagger UI at `/api/docs`
  - [ ] Generate client SDKs

- [ ] **Environment Variable Management**
  - [ ] UI to view/edit container env vars
  - [ ] Import from .env file
  - [ ] Secret masking for sensitive values

---

## Phase 4: Monitoring & Observability

### Metrics & Visualization

- [ ] **Historical Metrics**
  - [ ] Store metrics in SQLite/InfluxDB
  - [ ] Time-series graphs (Chart.js or similar)
  - [ ] Configurable time ranges (1h, 24h, 7d, 30d)
  - [ ] CPU, memory, disk, network per container

- [ ] **Network Monitoring**
  - [ ] Per-container network I/O
  - [ ] Network topology visualization
  - [ ] Connection tracking

- [ ] **Alerting System**
  - [ ] Define alert rules (CPU > 90%, memory > 80%, etc.)
  - [ ] Alert actions: email, webhook
  - [ ] Alert history

- [ ] **Dashboard Customization**
  - [ ] Drag-and-drop widget placement
  - [ ] Save multiple dashboard layouts
  - [ ] Custom widget creation

---

## Phase 5: UI/UX Improvements

### Interface Enhancements

- [ ] **Command Palette**
  - [ ] Cmd+K / Ctrl+K activation
  - [ ] Quick actions (restart container, view logs, etc.)
  - [ ] Fuzzy search

- [ ] **Keyboard Shortcuts**
  - [ ] Vim-style navigation (j/k for list navigation)
  - [ ] Shortcut reference modal (?)

- [ ] **Internationalization (i18n)**
  - [ ] Extract strings to locale files
  - [ ] Support English, add other languages
  - [ ] Language selector in settings

- [ ] **Theming**
  - [ ] More theme options beyond dark/light
  - [ ] Custom accent color picker
  - [ ] Per-brand theming

---

## Phase 6: Data & Backup

### Backup & Restore

- [ ] **Container Backup**
  - [ ] Export container to tar (config + volumes)
  - [ ] Import container from tar
  - [ ] Schedule automatic backups

- [ ] **Volume Backup**
  - [ ] Backup volume to archive
  - [ ] Restore volume from archive
  - [ ] Incremental backup support
  - [ ] Backup to S3/MinIO

- [ ] **Configuration Backup**
  - [ ] Export all settings as JSON
  - [ ] Import settings
  - [ ] Version history of configs

---

## Phase 7: Automation & Orchestration

### Workflows

- [ ] **Cron Job Management**
  - [ ] List scheduled tasks
  - [ ] Add/edit/delete cron jobs
  - [ ] Common presets (daily backup, weekly cleanup)

- [ ] **Webhook Triggers**
  - [ ] Define webhook endpoints
  - [ ] Trigger actions on webhook calls
  - [ ] Webhook payload templates

- [ ] **Batch Operations**
  - [ ] Select multiple containers
  - [ ] Batch start/stop/restart
  - [ ] Batch delete with confirmation

---

## Completed Features

- [x] **Module System** - Core/external module architecture with manifests
- [x] Module loader (build-time discovery)
- [x] Module registry
- [x] Nav items integration from modules
- [x] System module (as core module)
- [x] Settings module (as core module)
- [x] JWT authentication with rate limiting
- [x] LAN-only access middleware
- [x] Security headers (CSP, X-Frame-Options, etc.)
- [x] Command execution with execFile (no shell injection)
- [x] Docker container management (list, start, stop, restart, remove)
- [x] Docker images, volumes, networks listing
- [x] Container logs viewer
- [x] System stats (CPU, RAM, disk, uptime)
- [x] Service control (systemd)
- [x] Settings with export/import
- [x] Responsive mobile-first UI
- [x] Dark/light theme toggle

---

## Notes

- **Effort Estimates**: Low (1-2 days), Medium (1 week), High (2+ weeks)
- **Dependencies**: Some features depend on others (e.g., RBAC needs audit logging infrastructure)
- **Order**: This roadmap suggests a logical order but can be adjusted based on user needs
