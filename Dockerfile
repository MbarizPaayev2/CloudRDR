# ==============================================================================
# CloudRDR Enterprise SOC Manager — Production Multi-Stage Container
# ==============================================================================

# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Production Runtime Stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install runtime dependencies (tini for PID 1 signal handling)
RUN apk add --no-cache tini curl

# Copy installed production dependencies and application files
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Run as non-privileged user for container security hardening
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/src/api/server.js"]
