#!/bin/bash
#
# Ralph Loop - Autonomous AI Development Loop
#
# Usage:
#   ./loop.sh              # Run with defaults (30 iterations)
#   ./loop.sh 50           # Run with 50 max iterations
#   MAX_ITERATIONS=100 ./loop.sh  # Via environment variable
#
# Environment Variables:
#   MAX_ITERATIONS      - Maximum loop iterations (default: 30)
#   RATE_LIMIT_SECONDS  - Seconds between iterations (default: 5)
#   PROMPT_FILE         - Path to prompt file (default: .ralph/PROMPT.md)
#

set -e

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-${1:-30}}
RATE_LIMIT_SECONDS=${RATE_LIMIT_SECONDS:-5}
PROMPT_FILE=${PROMPT_FILE:-.ralph/PROMPT.md}
LOG_DIR=".ralph/logs"
LOG_FILE="$LOG_DIR/ralph_$(date +%Y%m%d_%H%M%S).log"

# State tracking
ITERATION=0
CONSECUTIVE_ERRORS=0
MAX_CONSECUTIVE_ERRORS=3
LAST_OUTPUT_HASH=""
SAME_OUTPUT_COUNT=0
MAX_SAME_OUTPUT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  case $level in
    INFO)  color=$BLUE ;;
    OK)    color=$GREEN ;;
    WARN)  color=$YELLOW ;;
    ERROR) color=$RED ;;
    *)     color=$NC ;;
  esac

  echo -e "${color}[$timestamp] [$level] $message${NC}" | tee -a "$LOG_FILE"
}

# Cleanup on exit
cleanup() {
  log "INFO" "Loop terminated at iteration $ITERATION"
  log "INFO" "Log file: $LOG_FILE"
}
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
  if ! command -v claude &> /dev/null; then
    log "ERROR" "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi

  if [ ! -f "$PROMPT_FILE" ]; then
    log "ERROR" "Prompt file not found: $PROMPT_FILE"
    exit 1
  fi

  if [ ! -f "PROGRESS.md" ]; then
    log "WARN" "PROGRESS.md not found. Creating empty file."
    echo "# Development Progress" > PROGRESS.md
  fi

  if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    log "ERROR" "Not in a git repository. Ralph requires git for safety."
    exit 1
  fi
}

# Main loop
main() {
  log "INFO" "Starting Ralph Loop"
  log "INFO" "Max iterations: $MAX_ITERATIONS"
  log "INFO" "Prompt file: $PROMPT_FILE"
  log "INFO" "Rate limit: ${RATE_LIMIT_SECONDS}s between iterations"
  echo ""

  check_prerequisites

  while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))

    echo ""
    log "INFO" "=========================================="
    log "INFO" "Iteration $ITERATION of $MAX_ITERATIONS"
    log "INFO" "=========================================="

    # Run Claude
    PROMPT_CONTENT=$(cat "$PROMPT_FILE")

    if OUTPUT=$(claude --print "$PROMPT_CONTENT" 2>&1); then
      # Log full output
      echo "$OUTPUT" >> "$LOG_FILE"

      # Reset error counter on success
      CONSECUTIVE_ERRORS=0

      # Check for stuck loop (same output)
      OUTPUT_HASH=$(echo "$OUTPUT" | md5sum | cut -d' ' -f1)
      if [ "$OUTPUT_HASH" = "$LAST_OUTPUT_HASH" ]; then
        SAME_OUTPUT_COUNT=$((SAME_OUTPUT_COUNT + 1))
        log "WARN" "Same output detected ($SAME_OUTPUT_COUNT/$MAX_SAME_OUTPUT)"

        if [ $SAME_OUTPUT_COUNT -ge $MAX_SAME_OUTPUT ]; then
          log "ERROR" "Circuit breaker: Loop appears stuck (same output $MAX_SAME_OUTPUT times)"
          exit 1
        fi
      else
        SAME_OUTPUT_COUNT=0
        LAST_OUTPUT_HASH="$OUTPUT_HASH"
      fi

      # Check for completion signals
      if echo "$OUTPUT" | grep -qE "(COMPLETE|ALL_DONE|ALL_COMPLETE)"; then
        log "OK" "Task completed successfully!"
        log "OK" "Total iterations: $ITERATION"
        exit 0
      fi

      # Check for human intervention needed
      if echo "$OUTPUT" | grep -qE "BLOCKED:"; then
        log "WARN" "Task blocked - human intervention required"
        echo "$OUTPUT" | grep -E "BLOCKED:" | head -5
        exit 1
      fi

      if echo "$OUTPUT" | grep -qE "NEED_HUMAN:"; then
        log "WARN" "Human input requested"
        echo "$OUTPUT" | grep -E "NEED_HUMAN:" | head -5
        exit 1
      fi

      # Check for continue signal
      if echo "$OUTPUT" | grep -qE "CONTINUE"; then
        log "OK" "Iteration complete, continuing..."
      else
        log "WARN" "No explicit signal detected, continuing anyway..."
      fi

    else
      # Handle error
      CONSECUTIVE_ERRORS=$((CONSECUTIVE_ERRORS + 1))
      log "ERROR" "Error in iteration (consecutive: $CONSECUTIVE_ERRORS/$MAX_CONSECUTIVE_ERRORS)"

      if [ $CONSECUTIVE_ERRORS -ge $MAX_CONSECUTIVE_ERRORS ]; then
        log "ERROR" "Circuit breaker: Too many consecutive errors"
        exit 1
      fi

      log "WARN" "Retrying after error..."
    fi

    # Rate limiting
    if [ $ITERATION -lt $MAX_ITERATIONS ]; then
      log "INFO" "Waiting ${RATE_LIMIT_SECONDS}s before next iteration..."
      sleep $RATE_LIMIT_SECONDS
    fi
  done

  log "WARN" "Reached maximum iterations ($MAX_ITERATIONS)"
  log "INFO" "Review PROGRESS.md for current state"
  exit 1
}

# Run main
main "$@"
