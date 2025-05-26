#!/bin/bash

./scripts/exportDB.sh

bun run client:build

pm2 restart ecosystem.config.cjs
