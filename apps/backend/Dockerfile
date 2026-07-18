FROM node:20

WORKDIR /app

# Salin package-lock dan package.json
COPY package*.json ./
COPY src/infrastructure/prisma/schema.prisma ./src/infrastructure/prisma/

# Install semua dependensi
RUN npm ci

# Salin seluruh kode program (membutuhkan file Dockerfile terdeteksi di build context)
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=src/infrastructure/prisma/schema.prisma

# Build aplikasi NestJS ke folder dist/
RUN npm run build

# Buang devDependencies untuk menghemat space runtime
RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3030

CMD ["npm", "run", "start:prod"]
