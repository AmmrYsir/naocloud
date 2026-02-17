# ServerPilot Roadmap

A prioritized list of features to implement.

---

## Suggested Features (Priority Order)

### Security

- **2FA (TOTP)** - Two-factor authentication using authenticator apps
- **API Key Management** - Generate API keys for programmatic access

### Docker Enhancements

- ~~**Resource Limits**~~ - Set CPU/memory limits on containers ✅
- ~~**Docker Compose**~~ - Manage compose stacks (start/stop/logs) ✅
- ~~**Container Terminal**~~ - Web-based shell access (xterm.js) ✅
- ~~**Volume Backup/Restore**~~ - Backup and restore volumes ✅
- ~~**Image Scanning**~~ - Integrate Trivy for vulnerability scanning ✅

### Developer Experience

- **Web Terminal** - Terminal access to host system
- **File Manager** - Browse/upload/download files
- **Log Streaming** - Live container logs via WebSocket
- **OpenAPI/Swagger** - API documentation

### Monitoring

- **Historical Metrics** - Store and graph historical CPU/memory/disk data
- **Alerting** - Configurable alerts (CPU > 90%, etc.)
- **Custom Dashboard** - Drag-and-drop widgets

### UI/UX

- **Command Palette** - Cmd+K for quick actions
- **Keyboard Shortcuts** - Vim-style navigation
- **Internationalization** - Multi-language support

### Data & Backup

- **Scheduled Backups** - Automated backup jobs
- **Cloud Storage** - Backup to S3/MinIO
- **Config Versioning** - Track config changes

### Automation

- **Cron Jobs** - UI for managing scheduled tasks
- **Webhooks** - Trigger actions on events
- **Batch Operations** - Multi-container start/stop/restart

---

## Completed Features

### Core System
- Module System (core + external modules)
- Module Management UI (enable/disable/install)
- JWT Authentication with rate limiting
- LAN-only access middleware
- Security headers (CSP, X-Frame-Options)
- Safe command execution (execFile)
- Responsive mobile-first UI
- Dark/light theme toggle

### Security
- **RBAC** - Role-based access control (admin, operator, viewer)
- **User Management** - Add/edit/delete users with role assignment
- **Audit Logging** - Log all admin actions with user, timestamp, IP
- **Password Change** - Users can change their own passwords
- Non-disableable security modules

### Docker
- Docker container management (list, start, stop, restart, remove)
- Docker images, volumes, networks management
- Container logs viewer
- **Resource Limits** - View and update container CPU/memory limits
- **Docker Compose** - List projects, start/stop/restart/pull, view logs
- **Container Terminal** - Execute commands inside containers via API
- **Volume Backup/Restore** - Create and restore tar.gz backups
- **Image Scanning** - Vulnerability scanning with Trivy integration

### System
- System stats (CPU, RAM, disk, uptime)
- Service management module (start/stop/restart services, view logs, config)
- Service control (systemd)

### Settings
- Settings export/import
