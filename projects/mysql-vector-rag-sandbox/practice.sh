#!/usr/bin/env bash
# ============================================================================
# MySQL 26.x / 9.x Isolated Local Sandbox & Vector/RAG Runner
# Usage:
#   ./practice.sh init             - Initialize isolated MySQL data directory
#   ./practice.sh start|status     - Check sandbox status & list databases
#   ./practice.sh shell [db_name]  - Open interactive MySQL CLI (default: ai_vector_demo)
#   ./practice.sh seed             - Seed relational & AI vector/RAG schemas
#   ./practice.sh stage1           - Run Stage 1 exercises (Foundations & Sakila)
#   ./practice.sh stage2           - Run Stage 2 exercises (Schema, Analytics, Antipatterns)
#   ./practice.sh stage3           - Run Stage 3 exercises (Indexing, EXPLAIN, Internals)
#   ./practice.sh stage4           - Run Stage 4 exercises (Native VECTOR, DISTANCE, DualRAG)
#   ./practice.sh stop             - Stop the local MySQL sandbox cleanly
# ============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOCKET="${MYSQL_SANDBOX_SOCKET:-/tmp/mysql_portfolio_sandbox.sock}"
PORT="${MYSQL_SANDBOX_PORT:-3307}"
PID_FILE="${MYSQL_SANDBOX_PID:-/tmp/mysql_portfolio_sandbox.pid}"
DATA_DIR="$PROJECT_DIR/.mysql_sandbox/data"

MYSQLD_BIN="$(command -v mysqld || echo /opt/homebrew/bin/mysqld)"
MYSQL_BIN="$(command -v mysql || echo /opt/homebrew/bin/mysql)"
MYSQLADMIN_BIN="$(command -v mysqladmin || echo /opt/homebrew/bin/mysqladmin)"

ensure_initialized() {
  if [[ ! -d "$DATA_DIR" ]]; then
    echo "Initializing isolated MySQL data directory at $DATA_DIR..."
    mkdir -p "$DATA_DIR"
    "$MYSQLD_BIN" --initialize-insecure --datadir="$DATA_DIR"
  fi
}

ensure_running() {
  ensure_initialized
  if ! "$MYSQLADMIN_BIN" --socket="$SOCKET" -u root ping >/dev/null 2>&1; then
    echo "Starting local MySQL sandbox on socket $SOCKET (port $PORT)..."
    "$MYSQLD_BIN" \
      --datadir="$DATA_DIR" \
      --socket="$SOCKET" \
      --port="$PORT" \
      --mysqlx=0 \
      --pid-file="$PID_FILE" >/dev/null 2>&1 &
    for _ in $(seq 1 15); do
      if "$MYSQLADMIN_BIN" --socket="$SOCKET" -u root ping >/dev/null 2>&1; then
        echo "MySQL sandbox started!"
        return 0
      fi
      sleep 1
    done
    echo "Error: Could not start MySQL sandbox." >&2
    exit 1
  fi
}

cmd="${1:-status}"

case "$cmd" in
  init)
    ensure_initialized
    echo "Sandbox initialized at $DATA_DIR."
    ;;
  start|status)
    ensure_running
    "$MYSQL_BIN" --socket="$SOCKET" -u root -t -e "
      SELECT VERSION() AS mysql_version, @@port AS port, @@socket AS socket;
      SHOW DATABASES;
    "
    ;;
  stop)
    if "$MYSQLADMIN_BIN" --socket="$SOCKET" -u root ping >/dev/null 2>&1; then
      "$MYSQLADMIN_BIN" --socket="$SOCKET" -u root shutdown
      echo "MySQL sandbox stopped."
    else
      echo "MySQL sandbox is not running."
    fi
    ;;
  shell)
    ensure_running
    db="${2:-ai_vector_demo}"
    echo "Connecting to database '$db' (Type 'exit' to quit)..."
    "$MYSQL_BIN" --socket="$SOCKET" -u root -D "$db"
    ;;
  seed)
    ensure_running
    echo "Seeding relational practice schemas (mile_end_market, university_db, lab_db)..."
    "$MYSQL_BIN" --socket="$SOCKET" -u root < "$PROJECT_DIR/sql/setup_practice_db.sql"
    echo "Seeding Stage 4 AI Vector & Hybrid DualRAG schema (ai_vector_demo)..."
    "$MYSQL_BIN" --socket="$SOCKET" -u root < "$PROJECT_DIR/sql/ai_vector_setup.sql"
    echo "Done! Note: Stage 1–3 exercises also reference the public MySQL Sakila sample DB."
    ;;
  stage1)
    ensure_running
    "$MYSQL_BIN" --socket="$SOCKET" -u root -t -v < "$PROJECT_DIR/sql/stage1_foundations_sakila.sql"
    ;;
  stage2)
    ensure_running
    "$MYSQL_BIN" --socket="$SOCKET" -u root -t -v < "$PROJECT_DIR/sql/stage2_schema_analytics_antipatterns.sql"
    ;;
  stage3)
    ensure_running
    "$MYSQL_BIN" --socket="$SOCKET" -u root -t -v < "$PROJECT_DIR/sql/stage3_indexing_performance_internals.sql"
    ;;
  stage4)
    ensure_running
    "$MYSQL_BIN" --socket="$SOCKET" -u root -t -v < "$PROJECT_DIR/sql/stage4_ai_vectors_rag.sql"
    ;;
  *)
    echo "Usage: ./practice.sh {init|start|status|stop|shell [db]|seed|stage1|stage2|stage3|stage4}"
    exit 1
    ;;
esac
