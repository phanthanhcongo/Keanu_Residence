# syntax=docker/dockerfile:1.4
# Stage 1: Build NestJS app
FROM node:20-slim AS builder
# Prisma requires OpenSSL - node:20-slim doesn't include it
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm install

COPY . .

# Prisma generate doesn't need a real DB connection, just a valid URL format
ARG DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# Stage 2: Run production app
FROM node:20-slim
# Prisma requires OpenSSL - node:20-slim doesn't include it
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

# Copy package files first (including package-lock.json for consistent installs)
COPY package*.json ./

# Install production dependencies using npm ci for faster, reliable installs
# Note: Prisma is in dependencies, so it will be installed
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci --omit=dev --legacy-peer-deps || \
    npm install --production --legacy-peer-deps

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Copy Prisma generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000

# Create uploads/avatars directory
RUN mkdir -p /app/uploads/avatars

# Create startup script that runs migrations then starts the app
RUN echo '#!/bin/sh\nnpx prisma migrate deploy\nnode dist/src/main.js' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
