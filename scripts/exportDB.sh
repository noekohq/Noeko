#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
TRANSFER_DIR="$PROJECT_ROOT/temp_backups"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 ('docker compose') is required." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

dotenv_value() {
  bun --env-file="$ENV_FILE" -e '
    const key = Bun.argv.at(-1);
    process.stdout.write(process.env[key] ?? "");
  ' "$1"
}

DB_USER="$(dotenv_value DB_USER)"
DB_PASSWORD="$(dotenv_value DB_PASSWORD)"
DB_NAMESPACE="$(dotenv_value DB_NAMESPACE)"
DB_DATABASE="$(dotenv_value DB_DATABASE)"
DB_EXPORT_LOCATION="$(dotenv_value DB_EXPORT_LOCATION)"

: "${DB_USER:?}" "${DB_PASSWORD:?}" "${DB_NAMESPACE:?}" "${DB_DATABASE:?}"

EXPORT_DIR="${1:-${DB_EXPORT_LOCATION:-$PROJECT_ROOT/db_backups}}"
mkdir -p "$TRANSFER_DIR" "$EXPORT_DIR"
EXPORT_DIR="$(cd "$EXPORT_DIR" && pwd)"

TIMESTAMP="$(date +'%Y%m%d%H%M%S')"
FILENAME="db_backup_${TIMESTAMP}.surql"
TRANSFER_PATH="$TRANSFER_DIR/$FILENAME"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Exporting $DB_NAMESPACE/$DB_DATABASE..."

docker compose --project-directory "$PROJECT_ROOT" exec -T surrealdb /surreal export \
  --endpoint http://127.0.0.1:8000 \
  --user "$DB_USER" \
  --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" \
  --database "$DB_DATABASE" \
  "/transfers/$FILENAME"

if [[ "$EXPORT_DIR" != "$TRANSFER_DIR" ]]; then
  mv "$TRANSFER_PATH" "$EXPORT_DIR/$FILENAME"
fi

FINAL_PATH="$EXPORT_DIR/$FILENAME"
shasum -a 256 "$FINAL_PATH"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Export saved to $FINAL_PATH"
