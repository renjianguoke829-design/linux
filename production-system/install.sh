#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
SCHEMA_INIT_SCRIPT="$ROOT_DIR/database/init.sh"
CRONTAB_FILE="$ROOT_DIR/scripts/crontab.txt"

CURRENT_STEP=0
TOTAL_STEPS=10

log() { echo "[INFO] $*"; }
ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
err() { echo "[ERROR] $*" >&2; }

progress() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  echo "\n===== [步骤 ${CURRENT_STEP}/${TOTAL_STEPS}] $* ====="
}

trap 'err "安装失败：请检查上方报错信息（步骤 ${CURRENT_STEP}/${TOTAL_STEPS}）。"' ERR

require_sudo() {
  if ! command -v sudo >/dev/null 2>&1; then
    err "未检测到 sudo，请先安装 sudo 并确保当前用户有管理员权限。"
    exit 1
  fi
}

check_os() {
  progress "检测操作系统（支持 Ubuntu 20.04+ / Debian 11+）"

  if [[ ! -f /etc/os-release ]]; then
    err "无法识别操作系统：缺少 /etc/os-release"
    exit 1
  fi

  # shellcheck source=/etc/os-release
  source /etc/os-release
  local os_id="${ID:-}"
  local version_id="${VERSION_ID:-0}"
  local major_version="${version_id%%.*}"

  case "$os_id" in
    ubuntu)
      if (( major_version < 20 )); then
        err "不支持的 Ubuntu 版本：${version_id}，需要 20.04+"
        exit 1
      fi
      ;;
    debian)
      if (( major_version < 11 )); then
        err "不支持的 Debian 版本：${version_id}，需要 11+"
        exit 1
      fi
      ;;
    *)
      err "当前系统 ${PRETTY_NAME:-$os_id} 不受支持，仅支持 Ubuntu 20.04+ / Debian 11+"
      exit 1
      ;;
  esac

  ok "系统检测通过：${PRETTY_NAME:-$os_id}"
}

install_base_dependencies() {
  progress "安装系统依赖（curl、git、wget 等）"
  sudo apt-get update
  sudo apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    postgresql-client \
    wget \
    cron
  ok "系统依赖安装完成"
}

install_docker_and_compose() {
  progress "安装 Docker 和 Docker Compose"

  if ! command -v docker >/dev/null 2>&1; then
    log "Docker 未安装，开始安装..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER" || true
    ok "Docker 安装完成"
  else
    ok "Docker 已安装"
  fi

  if ! docker compose version >/dev/null 2>&1; then
    log "Docker Compose 插件未安装，开始安装..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    ok "Docker Compose 安装完成"
  else
    ok "Docker Compose 已安装"
  fi
}

install_rclone() {
  progress "安装 Rclone"
  if command -v rclone >/dev/null 2>&1; then
    ok "Rclone 已安装"
  else
    sudo apt-get update
    sudo apt-get install -y rclone
    ok "Rclone 安装完成"
  fi
}

install_ollama() {
  progress "安装 Ollama"
  if command -v ollama >/dev/null 2>&1; then
    ok "Ollama 已安装"
  else
    curl -fsSL https://ollama.com/install.sh | sh
    ok "Ollama 安装完成"
  fi
}

create_directories() {
  progress "创建所需目录"
  mkdir -p "$ROOT_DIR/data/postgres"
  mkdir -p "$ROOT_DIR/data/pgadmin"
  mkdir -p "$ROOT_DIR/data/qinglong"
  mkdir -p "$ROOT_DIR/data/ttyd"
  mkdir -p "$ROOT_DIR/logs"

  sudo mkdir -p /mnt/cloud/raw /mnt/cloud/refined /mnt/cloud/video /mnt/cloud/backup
  ok "目录创建完成"
}

start_docker_services() {
  progress "启动所有 Docker 服务"
  docker compose -f "$COMPOSE_FILE" up -d
  ok "Docker 服务启动完成"
}

init_database() {
  progress "初始化数据库（执行 schema.sql）"

  if [[ ! -x "$SCHEMA_INIT_SCRIPT" ]]; then
    err "数据库初始化脚本不存在或不可执行：$SCHEMA_INIT_SCRIPT"
    exit 1
  fi

  export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
  export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  export POSTGRES_USER="${POSTGRES_USER:-postgres}"
  export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
  export POSTGRES_DB="${POSTGRES_DB:-production}"

  bash "$SCHEMA_INIT_SCRIPT"
  ok "数据库初始化完成"
}

install_cron_tasks() {
  progress "安装定时任务"
  if [[ ! -f "$CRONTAB_FILE" ]]; then
    err "找不到定时任务文件：$CRONTAB_FILE"
    exit 1
  fi

  crontab "$CRONTAB_FILE"
  sudo systemctl enable cron >/dev/null 2>&1 || true
  sudo systemctl restart cron >/dev/null 2>&1 || true
  ok "定时任务安装完成"
}

print_summary() {
  progress "输出服务访问地址与默认账号"
  local host_ip
  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  host_ip="${host_ip:-localhost}"

  cat <<EOF

================ 安装完成 ================
PostgreSQL:
  地址: ${host_ip}:5432
  用户: postgres
  密码: \
    环境变量 POSTGRES_PASSWORD（默认 password）

pgAdmin:
  地址: http://${host_ip}:5050
  账号: admin@admin.com
  密码: admin

青龙面板:
  地址: http://${host_ip}:5700

ttyd 终端:
  地址: http://${host_ip}:7681

Ollama:
  本机服务: http://localhost:11434

云盘挂载目录:
  /mnt/cloud/raw
  /mnt/cloud/refined
  /mnt/cloud/video
  /mnt/cloud/backup

定时任务:
  已从 ${CRONTAB_FILE} 导入，可通过 crontab -l 查看
==========================================
EOF
}

main() {
  require_sudo
  check_os
  install_base_dependencies
  install_docker_and_compose
  install_rclone
  install_ollama
  create_directories
  start_docker_services
  init_database
  install_cron_tasks
  print_summary
}

main "$@"
