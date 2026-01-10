#!/bin/bash

./scripts/exportDB.sh

bun install

bun run client:build

supervisorctl restart noeko-prod

bun run ./scripts/pushDB.ts
