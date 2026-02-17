# ServerPilot Roadmap

A prioritized list of features to implement.

---

## Suggested Features (Priority Order)

### Security

- **2FA (TOTP)** - Two-factor authentication using authenticator apps
- **RBAC** - Role-based access control with custom roles (admin, operator, viewer)
- **API Key Management** - Generate API keys for programmatic access
- **Audit Logging** - Log all admin actions with user, timestamp, IP
- **User Management UI** - Add/edit/delete users, password change

### Docker Enhancements

- **Resource Limits** - Set CPU/memory limits on containers
- **Docker Compose** - Manage compose stacks (start/stop/logs)
- **Container Terminal** - Web-based shell access (xterm.js)
- **Volume Backup/Restore** - Backup and restore volumes
- **Image Scanning** - Integrate Trivy for vulnerability scanning

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

- Module System (core + external modules)
- Module Management UI (enable/disable/install)
- JWT Authentication with rate limiting
- LAN-only access middleware
- Security headers (CSP, X-Frame-Options)
- Safe command execution (execFile)
- Docker container management
- Docker images, volumes, networks
- Container logs viewer
- System stats (CPU, RAM, disk, uptime)
- Service control (systemd)
- Settings export/import
- Responsive mobile-first UI
- Dark/light theme toggle
