#!/usr/bin/env bash
set -euo pipefail

# 统一数据运输脚本
# 1) 从云服务器拉取新采集数据
# 2) 合并本地采集数据
# 3) 通过 rclone 写入云盘数据库目录

RCLONE_REMOTE="${RCLONE_REMOTE:-}"
CLOUD_DB_PATH="${CLOUD_DB_PATH:-production-db/raw-data}"
REMOTE_SOURCE_PATH="${REMOTE_SOURCE_PATH:-new_collections}"
LOCAL_COLLECT_DIR="${LOCAL_COLLECT_DIR:-/workspace/linux/production-system/data/collect}"
WORK_DIR="${WORK_DIR:-/tmp/production-data-transport}"
MERGED_DIR="${WORK_DIR}/merged"
PULL_DIR="${WORK_DIR}/pulled"

log() { echo "[INFO] $*"; }
err() { echo "[ERROR] $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "缺少命令: $1"
    exit 1
  }
}

prepare_dirs() {
  mkdir -p "$WORK_DIR" "$MERGED_DIR" "$PULL_DIR" "$LOCAL_COLLECT_DIR"
}

pull_from_cloud_server() {
  log "从云端拉取新采集数据..."
  rclone copy "${RCLONE_REMOTE}:${REMOTE_SOURCE_PATH}" "$PULL_DIR" --create-empty-src-dirs
}

merge_local_data() {
  log "合并本地采集数据..."
  rsync -a --ignore-existing "$PULL_DIR/" "$MERGED_DIR/"
  rsync -a "$LOCAL_COLLECT_DIR/" "$MERGED_DIR/"
}

push_to_cloud_database() {
  log "通过 rclone 写入云盘数据库目录..."
  rclone sync "$MERGED_DIR" "${RCLONE_REMOTE}:${CLOUD_DB_PATH}" --create-empty-src-dirs
}

main() {
  require_cmd rclone
  require_cmd rsync

  if [[ -z "$RCLONE_REMOTE" ]]; then
    err "请先设置 RCLONE_REMOTE（例如 export RCLONE_REMOTE=myremote）"
    exit 1
  fi

  prepare_dirs
  pull_from_cloud_server
  merge_local_data
  push_to_cloud_database

  log "数据运输完成。"
}

main "$@"
