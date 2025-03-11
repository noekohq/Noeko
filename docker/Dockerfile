FROM oven/bun:latest as builder

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./
COPY app ./app

RUN bun install

FROM oven/bun:latest as production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN bun build

CMD ["bun", "run", "start"]
