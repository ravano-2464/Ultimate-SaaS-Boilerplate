FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json

RUN npm install --workspace @ultimate/web --include-workspace-root

COPY . .
RUN npm run build --workspace @ultimate/web

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/apps/web/package.json /app/apps/web/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/web/.next /app/apps/web/.next
COPY --from=builder /app/apps/web/public /app/apps/web/public
COPY --from=builder /app/apps/web/next.config.ts /app/apps/web/next.config.ts

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
