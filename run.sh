#!/usr/bin/env bash
# PlainNote 服务管理脚本
# 用法: ./run.sh {start|stop|restart|status}
# 可用环境变量覆盖: HOST(默认 0.0.0.0) PORT(默认 3123) DB_PATH(默认 项目内 plainnote.db) STOP_TIMEOUT(默认 15)
set -u

APP_DIR=$(cd $(dirname ${BASH_SOURCE[0]}) && pwd)
ENTRY=$APP_DIR/dist/cli.js
PID_FILE=$APP_DIR/plainnote.pid
LOG_FILE=$APP_DIR/plainnote.log
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-3123}
DB_PATH=${DB_PATH:-$APP_DIR/plainnote.db}
STOP_TIMEOUT=${STOP_TIMEOUT:-15}

info() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
err() { printf '[%s] 错误: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }

port_in_use() {
  ss -lnt 2>/dev/null | awk -v p=":${PORT}$" 'NR>1 && $4 ~ p {f=1} END{exit !f}'
}
port_show() {
  ss -lntp 2>/dev/null | awk -v p=":${PORT}$" 'NR>1 && $4 ~ p'
}

# 本机非回环 IPv4，用于打印局域网访问地址。
lan_ipv4_addresses() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1
    return
  fi
  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | tr ' ' '\n' | awk '/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ && $0 !~ /^127\./'
  fi
}

read_pid() {
  [ -f $PID_FILE ] || return 1
  local pid
  pid=$(tr -dc '0-9' < $PID_FILE 2>/dev/null)
  [ -n $pid ] || return 1
  printf '%s' $pid
}

is_ours() {
  local pid=${1:-}
  [ -n $pid ] || return 1
  [ -d /proc/$pid ] || return 1
  tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null | grep -qF 'dist/cli.js'
}

alive_pid() {
  local pid
  pid=$(read_pid) || return 1
  is_ours $pid || return 1
  printf '%s' $pid
}

do_start() {
  local pid i
  if pid=$(alive_pid); then
    info PlainNote 已在运行 PID=$pid，无需重复启动
    return 0
  fi
  rm -f $PID_FILE

  if [ ! -f $ENTRY ]; then
    err 入口文件不存在 $ENTRY ，请先在项目目录执行 npm run build
    return 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    err 未找到 node 命令，请确认 Node 已安装且在 PATH 中
    return 1
  fi
  if port_in_use; then
    err 端口 $PORT 已被其他进程占用，请先释放或改用 PORT=其他端口 ./run.sh start
    port_show >&2
    return 1
  fi

  cd $APP_DIR || return 1
  info 启动 PlainNote HOST=$HOST PORT=$PORT DB=$DB_PATH
  nohup node $ENTRY --host $HOST --port $PORT --db $DB_PATH >>$LOG_FILE 2>&1 &
  pid=$!
  echo $pid > $PID_FILE

  for i in $(seq 1 30); do
    if ! is_ours $pid; then
      err 启动失败，进程已退出，日志末尾如下
      tail -n 20 $LOG_FILE >&2
      rm -f $PID_FILE
      return 1
    fi
    if port_in_use; then
      info 启动成功 PID=$pid 监听 $HOST:$PORT
      info 本机访问 http://127.0.0.1:$PORT
      local ip
      for ip in $(lan_ipv4_addresses); do
        info 局域网  http://$ip:$PORT
      done
      info 日志文件 $LOG_FILE
      return 0
    fi
    sleep 1
  done

  err 进程已拉起但端口 $PORT 在 30 秒内未就绪，请查看日志 $LOG_FILE
  return 1
}

do_stop() {
  local pid i
  if ! pid=$(alive_pid); then
    info PlainNote 未在运行
    rm -f $PID_FILE
    return 0
  fi

  info 正在停止 PlainNote PID=$pid
  kill -TERM $pid 2>/dev/null

  for i in $(seq 1 $STOP_TIMEOUT); do
    if ! is_ours $pid; then
      rm -f $PID_FILE
      info 已停止
      return 0
    fi
    sleep 1
  done

  info 进程未在 ${STOP_TIMEOUT}s 内退出，执行强制结束
  kill -KILL $pid 2>/dev/null
  sleep 1
  if is_ours $pid; then
    err 无法结束进程 $pid
    return 1
  fi
  rm -f $PID_FILE
  info 已强制停止
  return 0
}

do_status() {
  local pid
  if pid=$(alive_pid); then
    info 运行中 PID=$pid
    printf '  监听地址: %s:%s\n  数据库: %s\n  日志: %s\n' $HOST $PORT $DB_PATH $LOG_FILE
    port_show
    return 0
  fi
  info 未运行
  return 3
}

case ${1:-} in
  start) do_start ;;
  stop) do_stop ;;
  restart)
    do_stop || exit 1
    sleep 1
    do_start
    ;;
  status) do_status ;;
  *)
    printf '用法: %s {start|stop|restart|status}\n' "$(basename "$0")"
    printf '可选环境变量: HOST(默认 0.0.0.0) PORT(默认 3123) DB_PATH(默认 %s/plainnote.db)\n' "$APP_DIR"
    exit 2
    ;;
esac
