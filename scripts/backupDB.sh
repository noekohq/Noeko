#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines fail if any command fails, not just the last one.
set -o pipefail

# --- Helper Functions ---
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $@"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $@" >&2
  exit 1
}

# --- Pre-checks ---
if ! command -v docker-compose &> /dev/null; then error "docker-compose command could not be found."; fi
if ! command -v gcloud &> /dev/null; then error "gcloud command could not be found."; fi

# --- Load .env File ---
ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
    log "Loading environment variables from $ENV_FILE..."
    set -a; source "$ENV_FILE"; set +a
else
    error "$ENV_FILE not found."
fi

# --- Check required variables ---
: "${DB_USER?ERROR: DB_USER not set}"
: "${DB_PASSWORD?ERROR: DB_PASSWORD not set}"
: "${DB_NAMESPACE?ERROR: DB_NAMESPACE not set}"
: "${DB_DATABASE?ERROR: DB_DATABASE not set}"
: "${DB_BACKUP_BUCKET_NAME?ERROR: DB_BACKUP_BUCKET_NAME not set}"
: "${GCLOUD_KEY_FILE_PATH?ERROR: GCLOUD_KEY_FILE_PATH not set in .env}"
: "${GCLOUD_PROJECT_ID?ERROR: GCLOUD_PROJECT_ID not set in .env}"
log "Required variables are present."

# --- Determine Backup Type (The Core GFS Logic) ---
DAY_OF_WEEK=$(date +'%u') # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +'%d')
BACKUP_PREFIX="daily_"

# Else if it's Sunday, it's a 'Father'
if [[ "$DAY_OF_WEEK" -eq 7 ]]; then
    BACKUP_PREFIX="weekly_"
# If it's the 1st of the month, it's a 'Grandfather'
elif [[ "$DAY_OF_MONTH" -eq 1 ]]; then
    BACKUP_PREFIX="monthly_"
fi

# --- Define Filenames and Paths ---
EXPORT_PARENT_DIR="${DB_EXPORT_LOCATION:-./db_backups}"
mkdir -p "$EXPORT_PARENT_DIR"

TIMESTAMP=$(date +'%Y-%m-%dT%H-%M-%S')
FILENAME_BASE="db_backup_${BACKUP_PREFIX}${TIMESTAMP}.surql"
FILENAME_COMPRESSED="${FILENAME_BASE}.gz"

CONTAINER_TMP_PATH="/tmp/${FILENAME_BASE}"
HOST_EXPORT_PATH="${EXPORT_PARENT_DIR}/${FILENAME_BASE}"
HOST_COMPRESSED_PATH="${EXPORT_PARENT_DIR}/${FILENAME_COMPRESSED}"
DB_CONNECTION="${DB_HOST_CONNECTION:-http://localhost:8000}"

log "--- Starting Backup ---"
log "Backup Type: ${BACKUP_PREFIX%_}" # Removes trailing underscore for cleaner log
log "Filename: ${FILENAME_COMPRESSED}"

# --- Perform Export ---
log "Exporting database to container..."
docker-compose exec -T surrealdb /surreal export \
  --conn "$DB_CONNECTION" --user "$DB_USER" --pass "$DB_PASSWORD" \
  --namespace "$DB_NAMESPACE" --database "$DB_DATABASE" \
  "$CONTAINER_TMP_PATH" || error "Database export failed."

# --- Copy Export File to Host ---
log "Copying export from container..."
docker-compose cp "surrealdb:${CONTAINER_TMP_PATH}" "$HOST_EXPORT_PATH" || error "Copy from container failed."

# --- Cleanup Container ---
log "Cleaning up in container..."
docker-compose exec -T surrealdb rm "$CONTAINER_TMP_PATH" || log "Warning: Failed to remove temp file from container."

# --- Compress, Upload, and Cleanup ---
log "Compressing backup file..."
gzip -f "$HOST_EXPORT_PATH" || error "Compression failed."

log "Uploading to GCS..."
gcloud storage cp "$HOST_COMPRESSED_PATH" "gs://${DB_BACKUP_BUCKET_NAME}/" || error "GCS upload failed."

log "Cleaning up local file..."
rm "$HOST_COMPRESSED_PATH" || error "Local cleanup failed."

# --- Final Success Message ---
log "-----------------------------------------------------"
log "✅ Backup process complete!"
log "Backup uploaded to: gs://${DB_BACKUP_BUCKET_NAME}/${FILENAME_COMPRESSED}"
log "-----------------------------------------------------"

exit 0
