# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package*.json ./

COPY apps/backend/package.json apps/backend/

COPY apps/web/package.json apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build -w nextjs_tailwind_shadcn_ts

############################################

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /workspace/apps/web/.next/standalone ./

COPY --from=builder /workspace/apps/web/.next/static ./.next/static

COPY --from=builder /workspace/apps/web/public ./public

EXPOSE 3001

CMD ["node","server.js"]
