# 🚀 Ultimate SaaS Boilerplate

Boilerplate SaaS production-ready dengan arsitektur **multi-tenant**, auth lengkap, RBAC, subscription, queue, audit log, API docs, dan admin panel.

---

## 🎯 Fitur Utama

- Auth lengkap: `register`, `login`, `refresh`, `logout`, `me`
- RBAC global + tenant role:
  `SUPER_ADMIN`, `USER`, `OWNER`, `ADMIN`, `MEMBER`
- Multi-tenant workspace management
- Subscription management per tenant
- Email system (queue-based) + worker
- Audit log untuk aktivitas penting
- API docs otomatis (Swagger / OpenAPI)
- Admin panel untuk manajemen user global role + audit logs
- Realtime event (WebSocket Socket.IO)

---

## 🧰 Tech Stack

### 🖥️ Frontend

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-5A3E36)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery&logoColor=white)

### 🧠 Backend

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Access_&_Refresh-000000?logo=jsonwebtokens&logoColor=white)
![Socket.IO](https://img.shields.io/badge/WebSocket-Socket.IO-010101?logo=socketdotio&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-Queue-red)
![Nodemailer](https://img.shields.io/badge/Nodemailer-Email-0F9D58)

### 🗄️ Data Layer

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Queue_Broker-DC382D?logo=redis&logoColor=white)

### 🏗️ Infra & DevOps

![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?logo=nginx&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=githubactions&logoColor=white)

---

## 🗂️ Project Structure

```txt
📁 ultimate-saas-boilerplate/
├── 📁 .github
│   └── 📁 workflows
│       └── ⚙️ ci.yml
├── 📁 apps
│   ├── 📁 api
│   │   ├── 📁 prisma
│   │   │   ├── 📄 schema.prisma
│   │   │   └── 📄 seed.ts
│   │   ├── 📁 src
│   │   │   ├── 📁 admin
│   │   │   │   ├── 📁 dto
│   │   │   │   │   ├── 📄 list-users-query.dto.ts
│   │   │   │   │   └── 📄 update-user-role.dto.ts
│   │   │   │   ├── 📄 admin.controller.ts
│   │   │   │   ├── 📄 admin.module.ts
│   │   │   │   └── 📄 admin.service.ts
│   │   │   ├── 📁 audit
│   │   │   │   ├── 📄 audit.module.ts
│   │   │   │   ├── 📄 audit.service.ts
│   │   │   │   └── 📄 dto-list-audit-query.ts
│   │   │   ├── 📁 auth
│   │   │   │   ├── 📁 dto
│   │   │   │   │   ├── 📄 login.dto.ts
│   │   │   │   │   ├── 📄 refresh-token.dto.ts
│   │   │   │   │   └── 📄 register.dto.ts
│   │   │   │   ├── 📄 auth.controller.ts
│   │   │   │   ├── 📄 auth.module.ts
│   │   │   │   └── 📄 auth.service.ts
│   │   │   ├── 📁 common
│   │   │   │   ├── 📁 decorators
│   │   │   │   │   ├── 📄 current-user.decorator.ts
│   │   │   │   │   ├── 📄 public.decorator.ts
│   │   │   │   │   ├── 📄 roles.decorator.ts
│   │   │   │   │   └── 📄 tenant-roles.decorator.ts
│   │   │   │   ├── 📁 guards
│   │   │   │   │   ├── 📄 jwt-auth.guard.ts
│   │   │   │   │   ├── 📄 roles.guard.ts
│   │   │   │   │   └── 📄 tenant-roles.guard.ts
│   │   │   │   └── 📁 types
│   │   │   │       └── 📄 auth-user.type.ts
│   │   │   ├── 📁 email
│   │   │   │   ├── 📄 email.constants.ts
│   │   │   │   ├── 📄 email.module.ts
│   │   │   │   ├── 📄 email.processor.ts
│   │   │   │   └── 📄 email.service.ts
│   │   │   ├── 📁 prisma
│   │   │   │   ├── 📄 prisma.module.ts
│   │   │   │   └── 📄 prisma.service.ts
│   │   │   ├── 📁 realtime
│   │   │   │   ├── 📄 realtime.gateway.ts
│   │   │   │   └── 📄 realtime.module.ts
│   │   │   ├── 📁 subscriptions
│   │   │   │   ├── 📁 dto
│   │   │   │   │   └── 📄 update-subscription.dto.ts
│   │   │   │   ├── 📄 subscriptions.controller.ts
│   │   │   │   ├── 📄 subscriptions.module.ts
│   │   │   │   └── 📄 subscriptions.service.ts
│   │   │   ├── 📁 tenants
│   │   │   │   ├── 📁 dto
│   │   │   │   │   ├── 📄 create-tenant.dto.ts
│   │   │   │   │   ├── 📄 invite-member.dto.ts
│   │   │   │   │   └── 📄 update-member-role.dto.ts
│   │   │   │   ├── 📄 tenants.controller.ts
│   │   │   │   ├── 📄 tenants.module.ts
│   │   │   │   └── 📄 tenants.service.ts
│   │   │   ├── 📄 app.controller.spec.ts
│   │   │   ├── 📄 app.controller.ts
│   │   │   ├── 📄 app.module.ts
│   │   │   └── 📄 main.ts
│   │   ├── 📁 test
│   │   │   ├── 📄 app.e2e-spec.ts
│   │   │   └── ⚙️ jest-e2e.json
│   │   ├── ⚙️ .prettierrc
│   │   ├── 🐳 Dockerfile
│   │   ├── 📝 README.md
│   │   ├── 📄 eslint.config.mjs
│   │   ├── ⚙️ nest-cli.json
│   │   ├── ⚙️ package.json
│   │   └── ⚙️ tsconfig.json
│   └── 📁 web
│       ├── 📁 public
│       │   ├── 🖼️ file.svg
│       │   ├── 🖼️ globe.svg
│       │   ├── 🖼️ next.svg
│       │   ├── 🖼️ vercel.svg
│       │   └── 🖼️ window.svg
│       ├── 📁 src
│       │   ├── 📁 app
│       │   │   ├── 📁 admin
│       │   │   │   └── 📄 page.tsx
│       │   │   ├── 📁 dashboard
│       │   │   │   └── 📄 page.tsx
│       │   │   ├── 📁 login
│       │   │   │   └── 📄 page.tsx
│       │   │   ├── 📁 register
│       │   │   │   └── 📄 page.tsx
│       │   │   ├── 📄 favicon.ico
│       │   │   ├── 🎨 globals.css
│       │   │   ├── 📄 layout.tsx
│       │   │   └── 📄 page.tsx
│       │   ├── 📁 components
│       │   │   ├── 📁 ui
│       │   │   │   └── 📄 select-field.tsx
│       │   │   ├── 📄 app-shell.tsx
│       │   │   └── 📄 providers.tsx
│       │   └── 📁 lib
│       │       ├── 📄 api-client.ts
│       │       ├── 📄 auth-store.ts
│       │       └── 📄 types.ts
│       ├── ⚙️ .gitignore
│       ├── 🐳 Dockerfile
│       ├── 📝 README.md
│       ├── 📄 eslint.config.mjs
│       ├── 📄 next-env.d.ts
│       ├── 📄 next.config.ts
│       ├── ⚙️ package.json
│       ├── 📄 postcss.config.mjs
│       └── ⚙️ tsconfig.json
├── 📁 nginx
│   └── ⚙️ nginx.conf
├── ⚙️ .dockerignore
├── ⚙️ .env.example
├── ⚙️ .gitignore
├── 📝 README.md
├── ⚙️ docker-compose.yml
├── ⚙️ package-lock.json
└── ⚙️ package.json
```

---

## ⚙️ Environment Variables

Buat file `.env` dari `.env.example`.

**Core variable yang wajib valid:**

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_API_URL`
- `REDIS_HOST` dan `REDIS_PORT`

Contoh `DATABASE_URL` lokal:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ultimate_saas?schema=public
```

---

## 🏁 Quick Start (Local)

1. Copy environment file

```powershell
Copy-Item .env.example .env
```

2. Install dependencies

```bash
npm install
```

3. Generate Prisma client + push schema

```bash
npm run db:generate
npm run db:push
```

4. (Opsional) seed super admin

```bash
npm run db:seed
```

5. Jalankan API + Web sekaligus

```bash
npm run dev
```

Access:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/v1`
- Swagger: `http://localhost:4000/docs`

---

## 🧪 Scripts

- `npm run dev` → jalankan API + Web mode development
- `npm run build` → build API + Web
- `npm run lint` → lint API + Web
- `npm run test` → test API
- `npm run db:generate` → generate Prisma client
- `npm run db:push` → push schema ke database
- `npm run db:migrate` → migrate dev database
- `npm run db:seed` → seed data awal

---

## 🌐 API Surface

Base URL:

```txt
http://localhost:4000/v1
```

Endpoint groups:

- `/auth/*`
- `/tenants/*`
- `/tenants/:tenantId/subscription`
- `/admin/*`

Swagger UI:

```txt
http://localhost:4000/docs
```

---

## 🔐 RBAC Matrix (Ringkas)

| Scope | Role | Akses |
|---|---|---|
| Global | `SUPER_ADMIN` | Akses penuh seluruh tenant + admin endpoints |
| Global | `USER` | Akses sesuai membership tenant |
| Tenant | `OWNER` | Kelola tenant, member, subscription |
| Tenant | `ADMIN` | Kelola member & subscription (tanpa hak owner-level tertentu) |
| Tenant | `MEMBER` | Akses baca/use tenant |

---

## ⚡ Realtime Events

Socket namespace:

```txt
/realtime
```

Join tenant room:

```txt
event: join-tenant
payload: { "tenantId": "<tenant-id>" }
```

Broadcasted events:

- `tenant.member.updated`
- `subscription.updated`

---

## 🐳 Docker Compose

Jalankan seluruh service:

```bash
docker compose up --build
```

Service map:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Mailhog SMTP: `localhost:1025`
- Mailhog UI: `http://localhost:8025`
- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Nginx Gateway: `http://localhost`

---

## 🚦 CI/CD

Workflow:

```txt
.github/workflows/ci.yml
```

Pipeline steps:

- Install dependencies
- Prisma client generation
- Lint
- Build
