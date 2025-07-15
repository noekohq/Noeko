#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines fail if any command fails, not just the last one.
set -o pipefail

# --- Configuration ---
# Default location if not specified by argument or .env
DEFAULT_EXPORT_PARENT_DIR="./db_backups"
# Default connection string if not in .env (adjust if needed)
DEFAULT_DB_HOST_CONNECTION="http://localhost:8000"
# Temporary file path inside the container
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
  error "docker-compose command could not be found."
fi
# --- NEW: Check for gcloud CLI ---
if ! command -v gcloud &> /dev/null; then
  error "gcloud command could not be found. Please ensure it's installed and configured."
fi

# --- Load .env File ---
ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
    log "Loading environment variables from $ENV_FILE..."
    # Using 'set -a' is a more robust way to source .env files
    set -a
    source "$ENV_FILE"
    set +a
    log ".env file loaded."
else
    error "$ENV_FILE not found in the current directory ($(pwd))."
fi

# --- Check required variables ---
: "${DB_USER?ERROR: DB_USER not set}"
: "${DB_PASSWORD?ERROR: DB_PASSWORD not set}"
: "${DB_NAMESPACE?ERROR: DB_NAMESPACE not set}"
: "${DB_DATABASE?ERROR: DB_DATABASE not set}"
# --- NEW: Check for GCS Bucket Name ---
: "${DB_BACKUP_BUCKET_NAME?ERROR: DB_BACKUP_BUCKET_NAME not set in .env file}"
log "Required variables are present."

# --- Determine Export Location ---
EXPORT_PARENT_DIR="${DB_EXPORT_LOCATION:-$DEFAULT_EXPORT_PARENT_DIR}"
log "Using local export directory: '$EXPORT_PARENT_DIR'"
mkdir -p "$EXPORT_PARENT_DIR" || error "Failed to create export directory: $EXPORT_PARENT_DIR"

# --- Define Filenames and Paths (NEW: GFS Logic) ---
DATE_TAG=$(date +'%Y-%m-%d')
DAY_OF_WEEK=$(date +'%u') # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +'%d')

BACKUP_TYPE="daily"
# If it's the 1st of the month, call it a monthly backup
if [[ "$DAY_OF_MONTH" -eq 1 ]]; then
  BACKUP_TYPE="monthly"
# Else if it's Sunday, call it a weekly backup
elif [[ "$DAY_OF_WEEK" -eq 7 ]]; then
  BACKUP_TYPE="weekly"
fi

FILENAME_BASE="db_backup_${BACKUP_TYPE}_${DATE_TAG}.surql"
FILENAME_COMPRESSED="${FILENAME_BASE}.gz"

CONTAINER_TMP_PATH="${CONTAINER_TMP_DIR}/${FILENAME_BASE}"
HOST_EXPORT_PATH="${EXPORT_PARENT_DIR}/${FILENAME_BASE}"
HOST_COMPRESSED_PATH="${EXPORT_PARENT_DIR}/${FILENAME_COMPRESSED}"

DB_CONNECTION="${DB_HOST_CONNECTION:-$DEFAULT_DB_HOST_CONNECTION}"
log "Backup type: ${BACKUP_TYPE}. Filename: ${FILENAME_COMPRESSED}"

# --- Perform Export ---
log "Starting database export to container path: $CONTAINER_TMP_PATH ..."
docker-compose exec -T surrealdb /surreal export \
  --conn "$DB_CONNECTION" \
  --user "$DB_USER" \
  --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" \
  --database "$DB_DATABASE" \
  "$CONTAINER_TMP_PATH" || error "Database export command failed."

# --- Copy Export File to Host ---
log "Copying export file from container to host path: $HOST_EXPORT_PATH ..."
docker-compose cp "surrealdb:${CONTAINER_TMP_PATH}" "$HOST_EXPORT_PATH" || error "Failed to copy export file from container."

# --- Cleanup Container ---
log "Cleaning up temporary file in container: $CONTAINER_TMP_PATH ..."
docker-compose exec -T surrealdb rm "$CONTAINER_TMP_PATH" || log "Warning: Failed to remove temporary file from container."

# --- NEW: Compress, Upload, and Cleanup ---
log "Compressing backup file..."
gzip -f "$HOST_EXPORT_PATH" || error "Failed to compress backup file."
log "File compressed to: $HOST_COMPRESSED_PATH"

log "Uploading to Google Cloud Storage bucket: $DB_BACKUP_BUCKET_NAME ..."
gcloud storage cp "$HOST_COMPRESSED_PATH" "gs://${DB_BACKUP_BUCKET_NAME}/" || error "Failed to upload to GCS."
log "Upload successful!"

log "Cleaning up local backup file..."
rm "$HOST_COMPRESSED_PATH" || error "Failed to remove local backup file."
log "Local cleanup finished."

# --- Final Success Message ---
log "-----------------------------------------------------"
log "✅ Backup process complete!"
log "Backup uploaded to: gs://${DB_BACKUP_BUCKET_NAME}/${FILENAME_COMPRESSED}"
log "-----------------------------------------------------"

exit 0
