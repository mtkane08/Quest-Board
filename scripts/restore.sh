#!/usr/bin/env bash
# Restores a backup produced by backup.sh into a FRESH database named
# `questboard_restore_test` (never the live `questboard` database) — this
# script exists specifically so restoration can be tested without any risk
# to real data, per Section 49's "backups and restoration are tested."
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
RESTORE_DB="questboard_restore_test"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "Dropping and recreating ${RESTORE_DB}..."
docker exec questboard_postgres psql -U questboard -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
docker exec questboard_postgres psql -U questboard -d postgres -c "CREATE DATABASE ${RESTORE_DB} OWNER questboard;"

echo "Restoring ${BACKUP_FILE} into ${RESTORE_DB}..."
gunzip -c "$BACKUP_FILE" | docker exec -i questboard_postgres psql -U questboard -d "$RESTORE_DB"

echo "Verifying row counts against the live database..."
for TABLE in users quests quest_versions quest_attempts xp_events; do
  LIVE_COUNT=$(docker exec questboard_postgres psql -U questboard -d questboard -tAc "SELECT COUNT(*) FROM ${TABLE};")
  RESTORED_COUNT=$(docker exec questboard_postgres psql -U questboard -d "$RESTORE_DB" -tAc "SELECT COUNT(*) FROM ${TABLE};")
  if [ "$LIVE_COUNT" != "$RESTORED_COUNT" ]; then
    echo "MISMATCH on ${TABLE}: live=${LIVE_COUNT} restored=${RESTORED_COUNT}" >&2
    exit 1
  fi
  echo "  ${TABLE}: ${RESTORED_COUNT} rows (matches live)"
done

echo "Restoration verified. Cleaning up ${RESTORE_DB}..."
docker exec questboard_postgres psql -U questboard -d postgres -c "DROP DATABASE ${RESTORE_DB};"
echo "Done."
