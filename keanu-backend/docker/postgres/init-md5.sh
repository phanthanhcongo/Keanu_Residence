#!/bin/bash
# Force md5 auth for remote connections and re-set the password as md5 hash
# This runs after the default entrypoint has initialized the database

set -e

# Ensure the password is stored as md5 (not scram-sha-256)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER SYSTEM SET password_encryption = 'md5';
    SELECT pg_reload_conf();
    ALTER USER "$POSTGRES_USER" WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL

echo "PostgreSQL init: password re-set with md5 encryption"
