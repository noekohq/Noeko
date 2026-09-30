#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 ('docker compose') is required." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DB_USER:?}" "${DB_PASSWORD:?}" "${DB_NAMESPACE:?}" "${DB_DATABASE:?}"

docker compose --project-directory "$PROJECT_ROOT" exec surrealdb /surreal sql \
  --endpoint http://127.0.0.1:8000 \
  --user "$DB_USER" \
  --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" \
  --database "$DB_DATABASE"
