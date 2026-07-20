# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /workspace

COPY package*.json ./

COPY apps/backend/package.json apps/backend/

COPY apps/web/package.json apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run prisma:generate -w rbac-service

RUN npm run build -w rbac-service

###############################################

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /workspace/node_modules ./node_modules

COPY --from=builder /workspace/apps/backend/dist ./dist

COPY --from=builder /workspace/apps/backend/public ./public

COPY --from=builder /workspace/apps/backend/src/infrastructure/prisma ./src/infrastructure/prisma

COPY --from=builder /workspace/apps/backend/package.json ./package.json

EXPOSE 3030

CMD ["node","dist/main.js"]
