# ==========================================
# Stage 1: Builder
# Compiles the frontend and caches dependencies
# ==========================================
FROM oven/bun:1.3 AS builder
WORKDIR /usr/src/app

# 1. Install dependencies (Cached)
# We copy package files first to leverage Docker layer caching.
COPY package.json bun.lockb ./
RUN bun install

# 2. Copy source code
COPY . .

# 3. Build the frontend client
# This generates the ./dist folder with static assets
RUN bun run build:client

# ==========================================
# Stage 2: Production Runner
# Minimal runtime image for security and speed
# ==========================================
FROM oven/bun:1.3-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production

# 1. Copy built artifacts and source code
# Frontend assets
COPY --from=builder /usr/src/app/dist ./dist
# Backend source code
COPY --from=builder /usr/src/app/app ./app
# Shared libraries (Fixes the "Cannot find module" error)
COPY --from=builder /usr/src/app/shared ./shared

# 2. Install Production Dependencies
# We copy ONLY package.json (dropping bun.lockb) to force a fresh install.
# This avoids "Frozen Lockfile" errors caused by cross-platform differences.
COPY --from=builder /usr/src/app/package.json ./

# We use --ignore-scripts to skip dev lifecycle hooks like 'husky'
RUN bun install --production --ignore-scripts

# 3. Final Configuration
EXPOSE 3400

# Start the server directly
CMD ["bun", "run", "app/index.ts"]
