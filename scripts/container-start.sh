#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT:-5432}/${DATABASE_NAME}?schema=public&sslmode=require"
fi
npx prisma migrate deploy
exec node server.js
