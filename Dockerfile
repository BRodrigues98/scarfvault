# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# better-sqlite3 requires native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies (production only)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/

# ── Stage 2: Runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy built client and server from builder
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server      ./server

# Data directory — will be overridden by the volume mount in production
RUN mkdir -p /app/data/photos

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

CMD ["node", "server/index.js"]
