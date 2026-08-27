#!/usr/bin/env bash
# Section 40/49: "Automated backups, restoration tests." A minimal,
# real pg_dump wrapper against the local docker-compose Postgres — this is
# the local-dev/pilot-stage equivalent of what a hosted deployment (e.g.
# Fly.io + LiteFS, per docs/gate-0/05-recommended-stack.md) would run on a
# schedule. Deployment automation itself (cron, object storage upload,
# retention policy) is out of scope until a real hosting target exists —
# not attempted here rather than half-built against nothing.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/questboard-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up questboard_postgres to ${OUT_FILE}..."
docker exec questboard_postgres pg_dump -U questboard questboard | gzip > "$OUT_FILE"
echo "Backup complete: ${OUT_FILE} ($(du -h "$OUT_FILE" | cut -f1))"
