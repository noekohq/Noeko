# ==========================================
# Stage 1: Builder
# Compiles the frontend and prepares dependencies
# ==========================================
FROM oven/bun:1.3 AS builder
WORKDIR /usr/src/app

# 1. Install all dependencies (including devDeps for building)
# We copy lockfiles if they exist to ensure deterministic builds
COPY package.json bun.lock* bun.lockb* ./
RUN bun install

# 2. Copy source code
COPY . .

# 3. Build the frontend client
# This executes 'tsc && vite build', generating the ./dist folder
RUN bun run build

# ==========================================
# Stage 2: Production Runner
# Minimal runtime image for security and speed
# ==========================================
FROM oven/bun:1.3-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production

# 1. Copy built artifacts and necessary source code
# Frontend static assets
COPY --from=builder /usr/src/app/dist ./dist
# Public assets (served by Express)
COPY --from=builder /usr/src/app/public ./public
# Backend source code (Bun runs .ts directly)
COPY --from=builder /usr/src/app/app ./app
# Shared libraries and types
COPY --from=builder /usr/src/app/shared ./shared
# Package manifest and lockfiles for production install
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/bun.lock* /usr/src/app/bun.lockb* ./

# 2. Install Production Dependencies
# We use --production to skip devDependencies and --ignore-scripts to skip husky/lifecycle hooks
RUN bun install --production --ignore-scripts

# 3. Final Configuration
# Default port for Noeko is 3400 (can be overridden by PORT env var)
EXPOSE 3400

# Start the server using the production script defined in package.json
CMD ["bun", "run", "start"]