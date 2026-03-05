#!/usr/bin/env bash
set -euo pipefail

HTTP_PROXY_URL="${1:-${HTTP_PROXY_URL:-}}"
SOCKS5_PROXY_URL="${2:-${SOCKS5_PROXY_URL:-}}"
TEST_URL="${TEST_URL:-https://www.google.com/generate_204}"
TIMEOUT_SEC="${TIMEOUT_SEC:-8}"

status_line() {
  local type="$1"
  local available="$2"
  local latency="$3"
  local detail="$4"
  printf "[%s] 可用: %s | 延迟: %s ms | 详情: %s\n" "$type" "$available" "$latency" "$detail"
}

test_proxy() {
  local type="$1"
  local proxy="$2"

  if [[ -z "$proxy" ]]; then
    status_line "$type" "否" "-" "未提供代理地址"
    return 1
  fi

  local out
  local code
  out="$(curl -sS -o /dev/null -w '%{http_code} %{time_total}' --max-time "$TIMEOUT_SEC" --proxy "$proxy" "$TEST_URL" 2>&1)" || {
    status_line "$type" "否" "-" "$out"
    return 1
  }

  code="$(awk '{print $1}' <<<"$out")"
  local seconds
  seconds="$(awk '{print $2}' <<<"$out")"
  local latency_ms
  latency_ms="$(awk -v s="$seconds" 'BEGIN { printf "%.0f", s * 1000 }')"

  if [[ "$code" == "204" || "$code" == "200" ]]; then
    status_line "$type" "是" "$latency_ms" "HTTP状态码 $code"
    return 0
  fi

  status_line "$type" "否" "$latency_ms" "HTTP状态码 $code"
  return 1
}

echo "开始测试代理连通性..."
echo "目标地址: $TEST_URL"

overall=0
if ! test_proxy "HTTP" "$HTTP_PROXY_URL"; then
  overall=1
fi
if ! test_proxy "SOCKS5" "$SOCKS5_PROXY_URL"; then
  overall=1
fi

if [[ "$overall" -eq 0 ]]; then
  echo "代理测试完成：全部可用"
else
  echo "代理测试完成：存在不可用代理"
fi

exit "$overall"
