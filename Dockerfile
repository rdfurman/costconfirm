# Base image with Node.js
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove host-generated Prisma files (they have Darwin engines, we need Alpine)
RUN rm -rf /app/app/generated /app/node_modules/.prisma

# Generate Prisma Client (needs dummy DATABASE_URL)
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
# Set binary targets for Alpine Linux
RUN npx prisma generate --generator client

# Build Next.js application
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Copy public directory if it has content, otherwise create empty dir
COPY --from=builder /app/public ./public
RUN mkdir -p ./public

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files and engines (Alpine-generated)
COPY --from=builder /app/app/generated ./app/generated

# Copy Prisma query engine to where Next.js expects it
RUN mkdir -p .next/server/chunks && \
    cp -r /app/app/generated/prisma/*.node .next/server/chunks/ 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the application
CMD ["node", "server.js"]
