
## Future Roadmap

### Core Features
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
- [x] Plugin system for extending modules
- [ ] Monaco editor for docker-compose.yml / .env files
- [ ] WebSocket-based live log streaming

### Docker & Container Enhancements
- [ ] Container resource limits management (CPU/memory/IO quotas)
- [ ] Docker registry management (private registry setup)
- [ ] Image vulnerability scanning (Trivy/Clair integration)
- [ ] Dockerfile linter and best practices validator
- [ ] Container health check configuration UI
- [ ] Volume backup/restore with scheduling
- [ ] Docker Swarm mode support
- [ ] Multi-registry image pull (Docker Hub, GHCR, ECR)
- [ ] Container exec/shell access in browser
- [ ] Image layer inspection and analysis

### Monitoring & Performance
- [ ] Historical metrics with time-series graphs
- [ ] Custom metric collectors via plugins
- [ ] Network traffic monitoring per container
- [ ] Database performance monitoring (MySQL/PostgreSQL/Redis)
- [ ] Process explorer with resource usage
- [ ] Application performance monitoring (APM)
- [ ] Real-time event stream dashboard
- [ ] Performance benchmarking suite
- [ ] Disk I/O and latency monitoring

### Automation & Orchestration
- [ ] Cron job management UI
- [ ] Webhook triggers for deployments
- [ ] CI/CD pipeline integration (Jenkins/GitHub Actions/GitLab CI)
- [ ] Git-ops workflow support
- [ ] Automated rollback capabilities
- [ ] Task scheduler with dependencies
- [ ] Infrastructure as code export (Docker Compose/Kubernetes YAML)
- [ ] Batch operations (start/stop/restart multiple containers)

### Security & Access Control
- [ ] Two-factor authentication (TOTP/WebAuthn)
- [ ] Role-based access control (RBAC) with custom roles
- [ ] API key management with scoped permissions
- [ ] Secrets management (HashiCorp Vault integration)
- [ ] IP whitelisting/blacklisting
- [ ] Fail2ban integration and management
- [ ] Security audit scanner for containers
- [ ] LDAP/OAuth2/SAML authentication support
- [ ] Session management and device tracking

### Networking & Infrastructure
- [ ] Network topology visualization
- [ ] Firewall rules configuration (iptables/ufw)
- [ ] Port mapping and conflict detection
- [ ] DNS management for local domains
- [ ] VPN management (WireGuard/OpenVPN)
- [ ] Load balancer configuration
- [ ] Traffic routing rules
- [ ] Network diagnostics tools (ping, traceroute, bandwidth test)

### Data & Backup Management
- [ ] Database backup/restore UI (MySQL, PostgreSQL, MongoDB)
- [ ] Backup retention policies and cleanup
- [ ] S3/MinIO/cloud storage integration
- [ ] Incremental backup support
- [ ] Disaster recovery testing
- [ ] Snapshot management for volumes
- [ ] Cross-server backup replication
- [ ] Backup encryption and compression settings

### Collaboration & Multi-User
- [ ] Multi-user support with team workspaces
- [ ] Permission delegation (read-only, operator, admin)
- [ ] Activity feed and timeline
- [ ] Shared favorites and bookmarks
- [ ] Comment/annotation system for containers
- [ ] Approval workflows for sensitive operations
- [ ] User invitation system

### Developer Experience
- [ ] Integrated web-based terminal (xterm.js)
- [ ] File manager with upload/download
- [ ] Environment variable management UI
- [ ] Quick deploy templates (LAMP, MEAN, Wordpress, etc.)
- [ ] Port forwarding management
- [ ] REST API with OpenAPI/Swagger docs
- [ ] GraphQL API alternative
- [ ] SDK/CLI tool for remote management
- [ ] Container logs export (JSON/CSV)

### Integrations & Notifications
- [ ] Slack/Discord bot integration
- [ ] GitHub/GitLab repository webhooks
- [ ] Prometheus/Grafana integration
- [ ] Datadog/New Relic agent support
- [ ] PagerDuty incident management
- [ ] Cloudflare API integration
- [ ] Email server configuration (SMTP)
- [ ] Microsoft Teams notifications
- [ ] Webhook templates for custom integrations

### UI/UX Enhancements
- [ ] Dark/light/system theme toggle
- [ ] Customizable dashboard widgets (drag-and-drop)
- [ ] Keyboard shortcuts (vim-style navigation)
- [ ] Command palette (Cmd+K) for quick actions
- [ ] Mobile app improvements (offline support)
- [ ] Export reports (PDF/CSV/Excel)
- [ ] Internationalization (i18n) support
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] Custom color schemes and branding
- [ ] Graph/chart customization

### System Management
- [ ] Package manager UI (apt/yum/dnf)
- [ ] Systemd service manager with unit file editor
- [ ] User and group management
- [ ] Crontab visual editor
- [ ] System process manager (like htop)
- [ ] Kernel parameter tuning (sysctl)
- [ ] Log rotation configuration
- [ ] Disk partition management
- [ ] RAID monitoring and management

### Cost & Resource Optimization
- [ ] Resource usage analytics and trends
- [ ] Idle resource detection and alerts
- [ ] Optimization recommendations engine
- [ ] Capacity planning tools
- [ ] Cost estimation for cloud deployments
- [ ] Right-sizing recommendations for containers
- [ ] Resource quota enforcement

### Plugin Ecosystem
- [ ] Plugin marketplace with ratings/reviews
- [ ] Plugin dependency management
- [ ] Plugin update notifications
- [ ] Plugin SDK with TypeScript types
- [ ] Plugin testing framework
- [ ] Community plugin repository
- [ ] Plugin sandboxing and security scanning
- [ ] Plugin performance profiling

## Completed

- [x] **Plugin system** — File-based plugin architecture with manifest.json, sandboxed context, runtime enable/disable, admin UI, and API routing
- [x] **System Health Monitor plugin** — Built-in plugin with disk/memory usage checks, service monitoring, and dedicated `/health` page
- [x] **Security hardening** — Safe command execution (no shell), LAN-only middleware, JWT auth with rate limiting, CSRF protection, sanitized errors