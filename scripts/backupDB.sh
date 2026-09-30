#!/bin/bash

# --- STRICT MODE ---
# Exit immediately if a command fails, if a variable is unset, or if a pipe fails.
set -euo pipefail

# --- CONFIGURATION ---
# Load environment variables
if [ -f .env ]; then
    set -a; source .env; set +a
else
    echo "ERROR: .env file not found." >&2; exit 1
fi

# Required Variables (Will error if missing)
: "${DB_USER:?}" "${DB_PASSWORD:?}" "${DB_NAMESPACE:?}" "${DB_DATABASE:?}" "${DB_BACKUP_BUCKET_NAME:?}"

# --- PATHS ---
# 1. The Host-side folder (Where this script runs)
HOST_BACKUP_DIR="./temp_backups"
# 2. The Container-side folder (Mapped in docker-compose)
CONTAINER_MOUNT_POINT="/transfers"

# Ensure the host directory exists so the mount works
mkdir -p "$HOST_BACKUP_DIR"

# --- FILENAME LOGIC (GFS) ---
DAY_OF_WEEK=$(date +'%u')
DAY_OF_MONTH=$(date +'%d')

if [[ "$DAY_OF_WEEK" -eq 7 ]]; then
    TYPE="weekly"
elif [[ "$DAY_OF_MONTH" -eq 1 ]]; then
    TYPE="monthly"
else
    TYPE="daily"
fi

TIMESTAMP=$(date +'%Y-%m-%dT%H-%M-%S')
FILENAME="db_backup_${TYPE}_${TIMESTAMP}.surql"
FILENAME_GZ="${FILENAME}.gz"

# The Paths
CONTAINER_PATH="${CONTAINER_MOUNT_POINT}/${FILENAME}" # Where DB writes
HOST_PATH="${HOST_BACKUP_DIR}/${FILENAME}"           # Where we read
HOST_PATH_GZ="${HOST_BACKUP_DIR}/${FILENAME_GZ}"     # Where we zip

echo "[$(date)] Starting ${TYPE} backup..."

# --- STEP 1: EXPORT (Container -> Shared Shelf) ---
# We use the internal port 8000 since we are executing inside the docker network
docker compose exec -T surrealdb /surreal export \
    --endpoint http://127.0.0.1:8000 \
    --user "$DB_USER" \
    --pass "$DB_PASSWORD" \
    --namespace "$DB_NAMESPACE" \
    --database "$DB_DATABASE" \
    "$CONTAINER_PATH"

# --- STEP 2: COMPRESS (Host Side) ---
# We gzip the file sitting in ./temp_backups
gzip -f "$HOST_PATH"

# --- STEP 3: UPLOAD (Host Side) ---
gcloud storage cp "$HOST_PATH_GZ" "gs://${DB_BACKUP_BUCKET_NAME}/"

# --- STEP 4: CLEANUP (Host Side) ---
# Since we are on the host, 'rm' works perfectly.
rm "$HOST_PATH_GZ"

echo "[$(date)] ✅ Success! Uploaded: ${FILENAME_GZ}"
