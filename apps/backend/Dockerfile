FROM node:20-slim

WORKDIR /app

# Salin seluruh folder hasil build dan node_modules yang sudah dimasak oleh GitHub Actions
COPY package.json ./
COPY dist ./dist
COPY node_modules ./node_modules

# Khusus Prisma, kita butuh schema
COPY src/infrastructure/prisma ./src/infrastructure/prisma

ENV NODE_ENV=production
EXPOSE 3030

CMD ["npm", "run", "start:prod"]
