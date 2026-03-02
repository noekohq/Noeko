#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines fail if any command fails, not just the last one.
set -o pipefail

DEFAULT_DB_HOST_CONNECTION="http://localhost:8000"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $@"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $@" >&2
  exit 1
}

# --- Pre-checks ---
if ! command -v docker-compose &> /dev/null; then
  error "docker-compose command could not be found. Please ensure it's installed and in your PATH."
fi

ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
    log "Loading environment variables from $ENV_FILE using grep/export method..."
    # Attempt to export variables from .env file
    # - Filter out comments (lines starting with #, possibly preceded by whitespace)
    # - Filter out empty or whitespace-only lines
    # - Pass the remaining lines to export
    # CAVEAT: This method is less robust than 'source' for complex values (e.g., multi-line)
    # but should work for typical KEY="VALUE" or KEY=VALUE lines.
    if export $(grep -v '^[[:space:]]*#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | xargs); then
      log "Variables processed via export."
    else
      # Note: export itself might not error easily here, the check below is more critical
      log "Warning: export command finished, check variable status."
    fi

    ### DEBUG ### (Keep these for now)
    echo "--- DEBUG: Environment after export processing ---"
    env | grep DB_ || echo "No DB_ vars found in env"
    echo "--- END DEBUG ---"
    ### DEBUG ###

    # Check required variables (using parameter expansion with error)
    ### DEBUG ### (Keep these for now)
    echo "--- DEBUG: Checking DB_USER ---"
    echo "Value of DB_USER before check: [${DB_USER:-NOT SET}]"
    ### DEBUG ###
    : "${DB_USER?ERROR: DB_USER not set in $ENV_FILE or failed to load}"
    : "${DB_PASSWORD?ERROR: DB_PASSWORD not set in $ENV_FILE or failed to load}"
    : "${DB_NAMESPACE?ERROR: DB_NAMESPACE not set in $ENV_FILE or failed to load}"
    : "${DB_DATABASE?ERROR: DB_DATABASE not set in $ENV_FILE or failed to load}"
    log ".env variables checked."
else
    error "$ENV_FILE not found in the current directory ($(pwd)). Please ensure it exists where you run the script."
fi

DB_CONNECTION="${DB_HOST_CONNECTION:-$DEFAULT_DB_HOST_CONNECTION}"

docker compose exec surrealdb /surreal sql \
  --conn "$DB_CONNECTION" \
  --user "$DB_USER" \
  --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" \
  --database "$DB_DATABASE"
