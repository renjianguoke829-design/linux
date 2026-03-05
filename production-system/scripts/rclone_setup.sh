#!/usr/bin/env bash
set -euo pipefail

RCLONE_REMOTE="${RCLONE_REMOTE:-}"
CLOUD_MOUNT_POINT="${CLOUD_MOUNT_POINT:-/mnt/cloud}"
RCLONE_CACHE_DIR="${RCLONE_CACHE_DIR:-/var/cache/rclone}"
SYSTEMD_SERVICE_PATH="/etc/systemd/system/rclone-mount.service"

log() {
  echo "[INFO] $*"
}

error() {
  echo "[ERROR] $*" >&2
}

install_rclone() {
  if command -v rclone >/dev/null 2>&1; then
    log "rclone 已安装：$(rclone version | head -n 1)"
    return
  fi

  log "未检测到 rclone，开始自动安装..."

  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y rclone
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y epel-release
    sudo yum install -y rclone
  else
    error "不支持的包管理器，请手动安装 rclone 后重试。"
    exit 1
  fi

  log "rclone 安装完成。"
}

create_directories() {
  log "创建云盘目录结构..."
  sudo mkdir -p "${CLOUD_MOUNT_POINT}/raw"
  sudo mkdir -p "${CLOUD_MOUNT_POINT}/refined"
  sudo mkdir -p "${CLOUD_MOUNT_POINT}/video"
  sudo mkdir -p "${CLOUD_MOUNT_POINT}/backup"
  sudo mkdir -p "${RCLONE_CACHE_DIR}"

  sudo chown -R "$(id -u):$(id -g)" "${CLOUD_MOUNT_POINT}" "${RCLONE_CACHE_DIR}" || true
}

write_systemd_service() {
  if [[ -z "${RCLONE_REMOTE}" ]]; then
    error "未设置 RCLONE_REMOTE。请先导出环境变量，例如：export RCLONE_REMOTE=myremote"
    exit 1
  fi

  log "写入 systemd 服务文件：${SYSTEMD_SERVICE_PATH}"
  sudo tee "${SYSTEMD_SERVICE_PATH}" >/dev/null <<EOF
[Unit]
Description=Rclone Cloud Mount Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER}
Group=$(id -gn)
ExecStart=/usr/bin/rclone mount ${RCLONE_REMOTE}: ${CLOUD_MOUNT_POINT} \\
  --config=/home/${USER}/.config/rclone/rclone.conf \\
  --allow-other \\
  --dir-cache-time=72h \\
  --vfs-cache-mode=writes \\
  --vfs-cache-max-age=24h \\
  --cache-dir=${RCLONE_CACHE_DIR} \\
  --umask=002
ExecStop=/bin/fusermount -uz ${CLOUD_MOUNT_POINT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
}

enable_service() {
  log "刷新并启用 systemd 服务..."
  sudo systemctl daemon-reload
  sudo systemctl enable rclone-mount.service

  log "尝试启动 rclone 挂载服务..."
  if sudo systemctl restart rclone-mount.service; then
    log "rclone-mount.service 已启动。"
  else
    error "服务启动失败，请检查 remote 是否已配置（rclone config）以及网络连通性。"
    sudo systemctl status rclone-mount.service --no-pager || true
    exit 1
  fi
}

print_summary() {
  cat <<EOF

========== Rclone 挂载配置完成 ==========
挂载点：${CLOUD_MOUNT_POINT}
remote：${RCLONE_REMOTE}
systemd：${SYSTEMD_SERVICE_PATH}

请确认你已提前执行：
  rclone config
并创建 remote：${RCLONE_REMOTE}
=========================================
EOF
}

main() {
  install_rclone
  create_directories
  write_systemd_service
  enable_service
  print_summary
}

main "$@"
