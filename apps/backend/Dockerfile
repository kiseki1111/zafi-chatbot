# syntax=docker/dockerfile:1.7

#############################
# Builder
#############################
FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

# package terlebih dahulu supaya cache efektif
COPY package*.json ./

# BuildKit cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# copy source
COPY . .

# generate prisma client
RUN npx prisma generate \
    --schema=src/infrastructure/prisma/schema.prisma

# build nest
RUN npm run build

#############################
# Production
#############################
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# install production dependency saja
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# copy hasil build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/infrastructure/prisma ./src/infrastructure/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3030

CMD ["node","dist/main.js"]



# FROM node:20-slim

# WORKDIR /app

# # Salin seluruh folder hasil build dan node_modules yang sudah dimasak oleh GitHub Actions
# COPY package.json ./
# COPY dist ./dist
# COPY node_modules ./node_modules

# # Khusus Prisma, kita butuh schema
# COPY src/infrastructure/prisma ./src/infrastructure/prisma

# ENV NODE_ENV=production
# EXPOSE 3030

# CMD ["npm", "run", "start:prod"]
