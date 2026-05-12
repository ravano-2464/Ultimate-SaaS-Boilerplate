# API App

NestJS backend for Ultimate SaaS Boilerplate.

Includes:

- JWT auth + refresh token rotation
- Global + tenant RBAC
- Multi-tenant modules
- Subscription module
- Email queue (BullMQ + Redis + Nodemailer)
- Audit log service
- Swagger docs at `/docs`
- Socket.IO namespace `/realtime`

Main env examples are in:

- `apps/api/.env.example`
- root `.env.example`
