#!/bin/bash
echo "[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: Script execution started." >> /root/webroot/qwest-prod/logs/exports.log

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines fail if any command fails, not just the last one.
set -o pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# --- Configuration ---
PROJECT_ROOT="$SCRIPT_DIR/.."
DEFAULT_EXPORT_PARENT_DIR="$PROJECT_ROOT/db_backups"
ENV_FILE="$PROJECT_ROOT/.env"
DEFAULT_DB_HOST_CONNECTION="http://localhost:8000"
CONTAINER_TMP_DIR="/tmp"

# --- Helper Functions ---
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

# --- Load .env File ---
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

# --- Determine Export Location ---
# Priority: Command-line arg > .env > Default
CMD_LINE_EXPORT_DIR="${1:-}" # Get first argument, or empty string if not set
ENV_EXPORT_DIR="${DB_EXPORT_LOCATION:-}" # Get from .env, or empty string if not set

EXPORT_PARENT_DIR=""
SOURCE_INFO=""

if [[ -n "$CMD_LINE_EXPORT_DIR" ]]; then
  EXPORT_PARENT_DIR="$CMD_LINE_EXPORT_DIR"
  SOURCE_INFO="command line argument"
elif [[ -n "$ENV_EXPORT_DIR" ]]; then
  EXPORT_PARENT_DIR="$ENV_EXPORT_DIR"
  SOURCE_INFO=".env variable DB_EXPORT_LOCATION"
else
  EXPORT_PARENT_DIR="$DEFAULT_EXPORT_PARENT_DIR"
  SOURCE_INFO="default value"
fi

log "Using export directory: '$EXPORT_PARENT_DIR' (Source: $SOURCE_INFO)"

# --- Create Export Directory ---
log "Ensuring export directory exists..."
mkdir -p "$EXPORT_PARENT_DIR" || error "Failed to create export directory: $EXPORT_PARENT_DIR"

# --- Define Filenames and Paths ---
TIMESTAMP=$(date +'%Y%m%d%H%M%S')
FILENAME="db_backup_${TIMESTAMP}.surql"
CONTAINER_TMP_PATH="${CONTAINER_TMP_DIR}/${FILENAME}" # Unique temp file in container
HOST_EXPORT_PATH="${EXPORT_PARENT_DIR}/${FILENAME}" # Full path on host

# Use connection string from .env, fallback to default if not set
DB_CONNECTION="${DB_HOST_CONNECTION:-$DEFAULT_DB_HOST_CONNECTION}"

# --- Perform Export ---
log "Starting database export to container path: $CONTAINER_TMP_PATH ..."
# Use -T instead of -it for non-interactive execution in scripts
docker-compose exec -T surrealdb /surreal export \
  --conn "$DB_CONNECTION" \
  --user "$DB_USER" \
  --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" \
  --database "$DB_DATABASE" \
  "$CONTAINER_TMP_PATH" || error "Database export command failed."

log "Export command finished successfully."

# --- Copy Export File to Host ---
log "Copying export file from container to host path: $HOST_EXPORT_PATH ..."
docker-compose cp "surrealdb:${CONTAINER_TMP_PATH}" "$HOST_EXPORT_PATH" || error "Failed to copy export file from container."
log "File copied successfully."

# --- Cleanup Container ---
log "Cleaning up temporary file in container: $CONTAINER_TMP_PATH ..."
docker-compose exec -T surrealdb rm "$CONTAINER_TMP_PATH" || log "Warning: Failed to remove temporary file from container. Manual cleanup might be needed."
log "Cleanup finished."

# --- Final Success Message ---
log "-----------------------------------------------------"
log "Database export successful!"
log "Backup saved to: $HOST_EXPORT_PATH"
log "-----------------------------------------------------"

exit 0
