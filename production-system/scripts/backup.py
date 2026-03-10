#!/usr/bin/env python3
"""PostgreSQL 自动备份脚本。

功能：
- 执行 pg_dump 导出数据库
- gzip 压缩备份文件到云盘目录（默认 /mnt/cloud/backup）
- 清理超过 30 天的历史备份
- 记录成功/失败日志
"""

from __future__ import annotations

import datetime as dt
import os
import shutil
import subprocess
import sys
from pathlib import Path

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/mnt/cloud/backup"))
LOG_FILE = Path(os.getenv("BACKUP_LOG_FILE", "/var/log/production_backup.log"))
RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
PG_DUMP_BIN = os.getenv("PG_DUMP_BIN", "pg_dump")


def log(message: str) -> None:
    timestamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}\n"
    print(line, end="")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as fp:
        fp.write(line)


def build_backup_name() -> str:
    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"production_{ts}.sql.gz"


def run_backup() -> Path:
    if shutil.which(PG_DUMP_BIN) is None:
        raise RuntimeError(f"未找到 pg_dump，可执行文件：{PG_DUMP_BIN}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    target = BACKUP_DIR / build_backup_name()

    env = os.environ.copy()
    database_url = env.get("DATABASE_URL")

    if database_url:
        cmd = [PG_DUMP_BIN, "--dbname", database_url, "--no-owner", "--no-privileges"]
    else:
        required = ["POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]
        missing = [k for k in required if not env.get(k)]
        if missing:
            raise RuntimeError(
                "未设置 DATABASE_URL，且以下 PostgreSQL 环境变量缺失：" + ", ".join(missing)
            )
        env["PGPASSWORD"] = env["POSTGRES_PASSWORD"]
        cmd = [
            PG_DUMP_BIN,
            "-h",
            env["POSTGRES_HOST"],
            "-p",
            env["POSTGRES_PORT"],
            "-U",
            env["POSTGRES_USER"],
            "-d",
            env["POSTGRES_DB"],
            "--no-owner",
            "--no-privileges",
        ]

    log(f"开始备份数据库到：{target}")
    with target.open("wb") as out_fp:
        proc_dump = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
        proc_gzip = subprocess.Popen(["gzip", "-c"], stdin=proc_dump.stdout, stdout=out_fp, stderr=subprocess.PIPE)

        assert proc_dump.stdout is not None
        proc_dump.stdout.close()

        dump_stderr = proc_dump.stderr.read().decode("utf-8", errors="ignore") if proc_dump.stderr else ""
        gzip_stderr = proc_gzip.stderr.read().decode("utf-8", errors="ignore") if proc_gzip.stderr else ""

        dump_code = proc_dump.wait()
        gzip_code = proc_gzip.wait()

    if dump_code != 0 or gzip_code != 0:
        if target.exists() and target.stat().st_size == 0:
            target.unlink(missing_ok=True)
        raise RuntimeError(
            f"备份失败（pg_dump={dump_code}, gzip={gzip_code}），"
            f"pg_dump错误：{dump_stderr.strip()} gzip错误：{gzip_stderr.strip()}"
        )

    log(f"备份成功：{target} ({target.stat().st_size} bytes)")
    return target


def cleanup_old_backups() -> int:
    cutoff = dt.datetime.now() - dt.timedelta(days=RETENTION_DAYS)
    deleted = 0

    if not BACKUP_DIR.exists():
        return 0

    for backup in BACKUP_DIR.glob("production_*.sql.gz"):
        modified = dt.datetime.fromtimestamp(backup.stat().st_mtime)
        if modified < cutoff:
            backup.unlink(missing_ok=True)
            deleted += 1
            log(f"清理过期备份：{backup}")

    return deleted


def main() -> int:
    try:
        run_backup()
        deleted = cleanup_old_backups()
        log(f"保留策略完成：删除 {deleted} 个超过 {RETENTION_DAYS} 天的备份文件")
        return 0
    except Exception as exc:  # noqa: BLE001
        log(f"备份失败：{exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
