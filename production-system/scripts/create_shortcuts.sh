#!/usr/bin/env bash
set -euo pipefail

DESKTOP_DIR="${HOME}/Desktop"
SYSTEM_APPS_DIR="/usr/share/applications"
TMP_DIR="$(mktemp -d)"

log() { echo "[INFO] $*"; }
err() { echo "[ERROR] $*" >&2; }

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$DESKTOP_DIR"

write_desktop_file() {
  local file_name="$1"
  local name="$2"
  local exec_cmd="$3"
  local icon="$4"

  cat >"${TMP_DIR}/${file_name}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
Comment=${name}
Exec=${exec_cmd}
Icon=${icon}
Terminal=false
Categories=Utility;
EOF

  chmod +x "${TMP_DIR}/${file_name}"
}

log "生成快捷方式文件..."
write_desktop_file \
  "生产控制台.desktop" \
  "生产控制台" \
  "bash -lc 'cd /home/set/linux/production-system/console && npm run electron'" \
  "utilities-system-monitor"

write_desktop_file \
  "国内浏览器.desktop" \
  "国内浏览器" \
  "bash -lc 'PROFILE_ID=production BROWSER_VARIANT=domestic /home/set/firefox/obj-domestic/dist/bin/firefox'" \
  "/home/set/firefox/browser/branding/domestic/default128.png"

write_desktop_file \
  "国际浏览器.desktop" \
  "国际浏览器" \
  "bash -lc 'PROFILE_ID=account_001 BROWSER_VARIANT=international /home/set/firefox/obj-international/dist/bin/firefox'" \
  "/home/set/firefox/browser/branding/international/default128.png"

write_desktop_file \
  "数据库管理.desktop" \
  "数据库管理" \
  "xdg-open http://localhost:5050" \
  "pgadmin"

write_desktop_file \
  "青龙面板.desktop" \
  "青龙面板" \
  "xdg-open http://localhost:5700" \
  "utilities-terminal"

write_desktop_file \
  "数据分析.desktop" \
  "数据分析" \
  "xdg-open http://localhost:3001" \
  "office-chart-bar"

log "复制到用户桌面：${DESKTOP_DIR}"
cp -f "${TMP_DIR}"/*.desktop "${DESKTOP_DIR}/"
chmod +x "${DESKTOP_DIR}"/*.desktop

log "复制到系统应用目录：${SYSTEM_APPS_DIR}"
if command -v sudo >/dev/null 2>&1; then
  sudo cp -f "${TMP_DIR}"/*.desktop "${SYSTEM_APPS_DIR}/"
  sudo chmod 644 "${SYSTEM_APPS_DIR}"/*.desktop
else
  err "未检测到 sudo，无法写入 ${SYSTEM_APPS_DIR}。请手动复制 ${TMP_DIR}/*.desktop"
  exit 1
fi

log "刷新桌面数据库"
if command -v update-desktop-database >/dev/null 2>&1; then
  sudo update-desktop-database "${SYSTEM_APPS_DIR}" || true
fi

log "快捷方式创建完成。"
