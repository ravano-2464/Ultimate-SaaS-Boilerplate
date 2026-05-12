# Ultimate SaaS Boilerplate

Production-oriented SaaS boilerplate with:

- Auth lengkap (`register`, `login`, `refresh`, `logout`, `me`)
- RBAC global + tenant (`SUPER_ADMIN`, `OWNER`, `ADMIN`, `MEMBER`)
- Subscription per tenant
- Multi-tenant workspace
- Email system + Redis queue worker
- Audit log
- API docs (Swagger / OpenAPI)
- Admin panel

## Stack

- Frontend: Next.js (App Router), React, Tailwind CSS v4, TypeScript, Zustand, TanStack Query
- Backend: NestJS, JWT + refresh token rotation, WebSocket (Socket.IO), BullMQ
- Data: PostgreSQL + Prisma ORM
- Infra: Docker, Nginx reverse proxy, GitHub Actions CI

## Structure

```txt
apps/
  api/   # NestJS API
  web/   # Next.js frontend
docker-compose.yml
nginx/nginx.conf
```

## Quick Start (Local)

1. Copy env:

```bash
cp .env.example .env
```

2. Install deps:

```bash
npm install
```

3. Generate Prisma client + push schema:

```bash
npm run db:generate
npm run db:push
```

4. Seed super admin (optional, reads `SUPER_ADMIN_*` from `.env`):

```bash
npm run db:seed
```

5. Run both apps:

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/v1`
- Swagger: `http://localhost:4000/docs`

## Docker Compose

```bash
docker compose up --build
```

Services:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Mailhog SMTP: `localhost:1025`
- Mailhog UI: `http://localhost:8025`
- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Nginx: `http://localhost`

## Realtime Event

Socket namespace: `/realtime`

Join room:

```txt
event: join-tenant
payload: { "tenantId": "<tenant-id>" }
```

Broadcasted events:

- `tenant.member.updated`
- `subscription.updated`

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`

- install dependencies
- generate Prisma client
- lint
- build
