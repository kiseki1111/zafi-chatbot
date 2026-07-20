# syntax=docker/dockerfile:1.7

#############################
# Base Image
#############################
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

#############################
# Dependencies
#############################
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

#############################
# Builder
#############################
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

#############################
# Production
#############################
FROM node:22-alpine AS runner
LABEL org.opencontainers.image.source="https://github.com/sisfoku/iqbal-backend"
LABEL org.opencontainers.image.description="Iqbal Web"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001

ENV HOSTNAME=0.0.0.0

CMD ["node","server.js"]






# FROM node:22-slim AS base

# # Step 1. Rebuild the source code only when needed
# FROM base AS builder
# WORKDIR /app

# # Install dependencies based on the preferred package manager
# COPY package.json package-lock.json ./
# COPY apps/web/package.json ./apps/web/package.json

# RUN npm install

# # Copy everything else
# COPY apps/web ./apps/web

# WORKDIR /app/apps/web
# # Next.js telemetry is disabled
# ENV NEXT_TELEMETRY_DISABLED 1

# # Build the Next.js app
# RUN npm run build

# # Step 2. Production image, copy all the files and run next
# FROM base AS runner
# WORKDIR /app

# ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1

# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Set the correct permission for prerender cache
# RUN mkdir .next
# RUN chown nextjs:nodejs .next

# # Automatically leverage output traces to reduce image size
# # https://nextjs.org/docs/advanced-features/output-file-tracing
# COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
# COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

# USER nextjs

# # Port untuk Next.js
# EXPOSE 3001
# ENV PORT 3001
# ENV HOSTNAME "0.0.0.0"

# # Untuk standalone server.js
# CMD ["node", "apps/web/server.js"]
