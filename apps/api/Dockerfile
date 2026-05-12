FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json

RUN npm install --workspace @ultimate/api --include-workspace-root

COPY . .
RUN npm run prisma:generate --workspace @ultimate/api
RUN npm run build --workspace @ultimate/api

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
