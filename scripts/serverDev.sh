#!/bin/bash

bun install

bun run db:detached

bun run server:watch
