#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$ROOT_DIR/schema.sql"

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:=password}"
: "${POSTGRES_DB:=production}"
: "${POSTGRES_HOST:=localhost}"
: "${POSTGRES_PORT:=5432}"

if ! command -v psql >/dev/null 2>&1; then
  echo "[ERROR] psql 未安装，请先安装 PostgreSQL 客户端。" >&2
  exit 1
fi

echo "[INFO] 正在初始化数据库 schema..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$SCHEMA_FILE"

echo "[OK] 数据库初始化完成。"
