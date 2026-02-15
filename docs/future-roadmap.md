
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
- [x] Plugin system for extending modules
- [ ] Monaco editor for docker-compose.yml / .env files
- [ ] WebSocket-based live log streaming

## Completed

- [x] **Plugin system** — File-based plugin architecture with manifest.json, sandboxed context, runtime enable/disable, admin UI, and API routing
- [x] **System Health Monitor plugin** — Built-in plugin with disk/memory usage checks, service monitoring, and dedicated `/health` page
- [x] **Security hardening** — Safe command execution (no shell), LAN-only middleware, JWT auth with rate limiting, CSRF protection, sanitized errors