FROM oven/bun:1.2.5 as builder

WORKDIR /project

COPY package.json ./
COPY vite.config.ts ./
COPY bun.lockb ./
COPY tsconfig.json tsconfig.node.json ./
COPY index.html ./
COPY app ./app
COPY src ./src

RUN bun install

FROM oven/bun:latest as production

WORKDIR /project

COPY --from=builder /project/package.json ./
COPY --from=builder /project/vite.config.ts ./
COPY --from=builder /project/bun.lockb ./
COPY --from=builder /project/tsconfig.json ./
COPY --from=builder /project/tsconfig.node.json ./
COPY --from=builder /project/index.html ./
COPY --from=builder /project/node_modules ./node_modules
COPY --from=builder /project/app ./app
COPY --from=builder /project/src ./src

RUN bun run client:build

CMD ["bun", "run", "start"]
