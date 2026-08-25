# Multi-stage Dockerfile for Token Insight & Analytics API

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition files
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src

# Build TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package definition files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built JavaScript files from builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
