#!/bin/bash
set -e

# Start postgres in background, wait for it, fix the password, then keep running
# This runs EVERY container start, not just on first init

docker-entrypoint.sh postgres -c password_encryption=md5 &
PG_PID=$!

# Wait for postgres to be ready
for i in $(seq 1 30); do
    if pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Force the password to md5 encoding
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ALTER SYSTEM SET password_encryption = 'md5';"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_reload_conf();"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';"
echo "=== Password ensured as md5 for user $POSTGRES_USER ==="

# Wait for postgres process
wait $PG_PID
