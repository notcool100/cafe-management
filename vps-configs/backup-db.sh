#!/bin/bash

# Configuration
BACKUP_DIR="/home/notcool/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/full_pg_backup_$TIMESTAMP.sql"
ARCHIVE_FILE="$BACKUP_DIR/full_pg_backup_$TIMESTAMP.tar.gz"
REMOTE_NAME="gdrive"
REMOTE_DIR="cafe-backups"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Database credentials
if [ -f "/etc/cafe/be.env.prod" ]; then
    export $(grep -v '^#' /etc/cafe/be.env.prod | xargs)
fi

echo "Starting full PostgreSQL database backup at $TIMESTAMP..."

# Perform pg_dumpall
# Note: pg_dumpall includes all databases, roles, and groups.
# We use the DATABASE_URL to extract connection info or pass it directly if supported.
if [ -n "$DATABASE_URL" ]; then
    # Create a temporary .pgpass file if password is in URL to avoid command line visibility
    # Or just pass the URL to pg_dumpall if the version supports it
    pg_dumpall --dbname="$DATABASE_URL" > "$BACKUP_FILE"
else
    echo "DATABASE_URL not found. Please ensure it's set in /etc/cafe/be.env.prod"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo "Backup successful. Compressing..."
    tar -czf "$ARCHIVE_FILE" -C "$BACKUP_DIR" "full_pg_backup_$TIMESTAMP.sql"
    rm "$BACKUP_FILE"
    
    echo "Uploading to Google Drive..."
    rclone copy "$ARCHIVE_FILE" "$REMOTE_NAME:$REMOTE_DIR"
    
    if [ $? -eq 0 ]; then
        echo "Upload successful."
    else
        echo "Upload failed."
    fi
    
    # Cleanup old backups (older than 7 days)
    find "$BACKUP_DIR" -name "full_pg_backup_*.tar.gz" -mtime +7 -delete
    echo "Local cleanup completed."
else
    echo "Backup failed."
    exit 1
fi

echo "Full PostgreSQL backup process finished."
