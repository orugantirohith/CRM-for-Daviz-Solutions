# ==============================================================================
# DAVIZ Solutions CRM — Production Multi-Stage Dockerfile
# Optimized for enterprise security, small image footprint, and high performance.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json .npmrc ./

# Install all dependencies (including devDependencies needed for Vite build)
RUN npm ci --legacy-peer-deps

# Copy application sources
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY api/ ./api/

# Build static production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install curl for container health checks
RUN apk add --no-cache curl

# Create dedicated non-root user and group
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy package manifests & install runtime dependencies
COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy pre-built frontend artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy backend server, API handlers, and config
COPY --chown=nodejs:nodejs server.ts tsconfig.json ./
COPY --chown=nodejs:nodejs api/ ./api/
COPY --chown=nodejs:nodejs public/ ./public/

# Ensure proper permissions
RUN chown -R nodejs:nodejs /app

# Drop root privileges
USER nodejs

# Expose default port
EXPOSE 3000

# Production container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start production server
CMD ["npm", "start"]

