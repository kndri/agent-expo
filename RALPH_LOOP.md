# The Ralph Loop Pattern

A modular, AI-driven development methodology for autonomous iterative development.

> *"Sit on the loop, not in it."* — Geoffrey Huntley

## Overview

The Ralph Loop (named after Ralph Wiggum's lovable persistence) is a technique for running AI coding agents in automated loops until specifications are fulfilled. The key insight: **progress doesn't persist in the LLM's context window—it lives in your files and git history.**

```bash
# The core concept is deceptively simple
while true; do claude --print "$(cat PROMPT.md)"; done
```

---

## Quick Start

### 1. Create the Essential Files

```
your-project/
├── PROMPT.md              # Instructions for each loop iteration
├── PROGRESS.md            # State tracking (what's done, what's next)
├── specs/                 # Detailed requirements
│   └── requirements.md
└── src/                   # Your code
```

### 2. Write Your PROMPT.md

```markdown
Read PROGRESS.md to understand current state.
Check specs/ for detailed requirements.
Work on the next incomplete task.
When a task is done, update PROGRESS.md.
If all tasks complete, output: COMPLETE
```

### 3. Run the Loop

```bash
# HITL Mode (Human-in-the-Loop) - Start here
claude --print "$(cat PROMPT.md)"
# Review output, then run again

# AFK Mode (Away From Keyboard) - Once confident
./loop.sh
```

---

## Two Operating Modes

### HITL (Human-in-the-Loop)

**Use for:** Exploration, learning, unfamiliar codebases

```bash
# Run one iteration at a time
claude --print "$(cat PROMPT.md)"

# Review the changes
git diff

# If good, run again. If not, adjust PROMPT.md
```

**Benefits:**
- Build intuition for how the loop works
- Catch issues early
- Refine your prompts based on output

### AFK (Away From Keyboard)

**Use for:** Well-defined tasks, overnight runs, CI/CD

```bash
# loop.sh - Autonomous execution with safeguards
#!/bin/bash

MAX_ITERATIONS=30  # Safety cap
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  echo "=== Iteration $((ITERATION + 1)) of $MAX_ITERATIONS ==="

  OUTPUT=$(claude --print "$(cat PROMPT.md)" 2>&1)
  echo "$OUTPUT"

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "COMPLETE"; then
    echo "Task completed!"
    exit 0
  fi

  # Check for explicit stop
  if echo "$OUTPUT" | grep -q "BLOCKED\|NEED_HUMAN"; then
    echo "Human intervention required"
    exit 1
  fi

  ITERATION=$((ITERATION + 1))
  sleep 2  # Rate limiting
done

echo "Max iterations reached"
exit 1
```

**Safety Rules for AFK:**
- Always cap iterations (30-50 for large tasks, 5-10 for small)
- Run in sandboxed environments (Docker, VM)
- Always run in git-tracked directories
- Review ALL code before merging

---

## The Three-Phase Workflow

### Phase 1: Define Requirements

Collaborative human-AI conversation to produce clear specifications.

```markdown
<!-- specs/requirements.md -->
# Feature: User Authentication

## Jobs To Be Done
- User can sign up with email/password
- User can log in and receive a session token
- User can log out and invalidate session

## Acceptance Criteria
- [ ] POST /auth/signup creates user
- [ ] POST /auth/login returns JWT token
- [ ] POST /auth/logout invalidates token
- [ ] Passwords are hashed with bcrypt
- [ ] Tests cover all endpoints

## Technical Constraints
- Use existing Express.js setup
- Store users in PostgreSQL
- JWT expires after 24 hours
```

### Phase 2: Planning Mode

AI analyzes requirements and creates implementation plan. **No code written yet.**

```markdown
<!-- PROMPT_plan.md -->
Read specs/requirements.md.
Analyze the current codebase to understand existing patterns.
Create IMPLEMENTATION_PLAN.md with:
1. Ordered list of tasks
2. Files to create/modify for each task
3. Dependencies between tasks

Do NOT write any code. Planning only.
```

### Phase 3: Building Mode

Execute the plan task-by-task with validation.

```markdown
<!-- PROMPT_build.md -->
Read PROGRESS.md for current state.
Read IMPLEMENTATION_PLAN.md for the task list.

Find the first unchecked task.
Implement it following existing code patterns.
Run tests: npm test
Run linter: npm run lint
Run type check: npm run typecheck

If all pass:
  - Update PROGRESS.md marking task complete
  - Commit changes with descriptive message
  - Output: CONTINUE

If blocked:
  - Document the blocker in PROGRESS.md
  - Output: BLOCKED - [reason]

If all tasks complete:
  - Output: COMPLETE
```

---

## File Structure

### Minimal Setup

```
project/
├── PROMPT.md          # Loop instructions
├── PROGRESS.md        # State tracking
└── specs/
    └── requirements.md
```

### Full Setup (Recommended)

```
project/
├── .ralph/                    # Ralph-specific files
│   ├── PROMPT.md              # Main loop instructions
│   ├── PROMPT_plan.md         # Planning phase prompt
│   ├── PROMPT_build.md        # Building phase prompt
│   ├── loop.sh                # Loop script
│   └── logs/                  # Execution logs
├── PROGRESS.md                # State tracking (root for visibility)
├── IMPLEMENTATION_PLAN.md     # Generated task list
├── AGENTS.md                  # AI operational guide (~60 lines max)
├── specs/                     # Requirements (one file per feature)
│   ├── auth.md
│   ├── api.md
│   └── ui.md
└── src/                       # Application code
```

---

## Core Files

### PROGRESS.md - The Memory

This file IS the AI's memory between iterations. Make it comprehensive.

```markdown
# Development Progress

## Current Status
**Phase:** Building
**Current Task:** Implement login endpoint
**Blocker:** None

## Completed Tasks
- [x] Set up project structure
- [x] Create user model
- [x] Implement signup endpoint

## In Progress
- [ ] Implement login endpoint ← CURRENT
- [ ] Implement logout endpoint
- [ ] Add authentication middleware

## Session Log

### Iteration 5 - 2024-01-15 10:30
- Completed: signup endpoint with validation
- Tests: 12 passing
- Next: login endpoint

### Iteration 4 - 2024-01-15 10:25
- Completed: user model with bcrypt hashing
- Added: password validation rules
```

### PROMPT.md - The Instructions

Clear, specific instructions the AI reads each iteration.

```markdown
# Development Loop Instructions

You are an autonomous developer working on this project.

## Your Process
1. Read PROGRESS.md to understand current state
2. Read IMPLEMENTATION_PLAN.md for task details
3. Find the next incomplete task (marked with [ ])
4. Implement the task completely
5. Run validation: `npm test && npm run lint && npm run typecheck`
6. Update PROGRESS.md with what you did
7. Commit your changes

## Output Signals
- Say "CONTINUE" to proceed to next iteration
- Say "COMPLETE" when all tasks are done
- Say "BLOCKED: [reason]" if you can't proceed
- Say "NEED_HUMAN: [question]" if you need clarification

## Rules
- One task per iteration (keep changes focused)
- Always run tests before committing
- Follow existing code patterns
- Don't modify unrelated files
```

### AGENTS.md - Operational Guide

Short reference for AI behavior (~60 lines max).

```markdown
# Agent Operations Guide

## Code Style
- TypeScript strict mode
- Functional patterns preferred
- No `any` types

## Testing
- Jest for unit tests
- Supertest for API tests
- Minimum 80% coverage

## Git
- Conventional commits: feat:, fix:, docs:, test:
- One logical change per commit
- Always include tests with features

## Don't
- Don't modify package.json without approval
- Don't add new dependencies
- Don't skip tests
- Don't change configuration files
```

---

## Exit Detection

The loop needs to know when to stop. Use explicit signals.

### Simple Approach (grep)

```bash
if echo "$OUTPUT" | grep -q "COMPLETE"; then
  exit 0
fi
```

### Robust Approach (dual condition)

Require BOTH heuristic indicators AND explicit signal:

```bash
# Count completion indicators
INDICATORS=0
echo "$OUTPUT" | grep -q "All tests pass" && INDICATORS=$((INDICATORS + 1))
echo "$OUTPUT" | grep -q "All tasks complete" && INDICATORS=$((INDICATORS + 1))
echo "$OUTPUT" | grep -q "COMPLETE" && INDICATORS=$((INDICATORS + 1))

# Exit only if multiple indicators present
if [ $INDICATORS -ge 2 ]; then
  echo "Task completed!"
  exit 0
fi
```

### Circuit Breaker

Stop if stuck in unproductive loops:

```bash
SAME_OUTPUT_COUNT=0
LAST_OUTPUT=""

while true; do
  OUTPUT=$(claude --print "$(cat PROMPT.md)")

  # Detect stuck loop
  if [ "$OUTPUT" = "$LAST_OUTPUT" ]; then
    SAME_OUTPUT_COUNT=$((SAME_OUTPUT_COUNT + 1))
    if [ $SAME_OUTPUT_COUNT -ge 3 ]; then
      echo "Circuit breaker: Loop appears stuck"
      exit 1
    fi
  else
    SAME_OUTPUT_COUNT=0
  fi

  LAST_OUTPUT="$OUTPUT"
done
```

---

## Backpressure Validation

Tasks with built-in success signals are ideal for AFK:

```bash
# In PROMPT.md, require validation before continuing
Run these commands and only continue if ALL pass:
- npm test
- npm run lint
- npm run typecheck
- npm run build

If any fail, fix the issues before updating PROGRESS.md.
```

```bash
# In loop.sh, verify validation passed
OUTPUT=$(claude --print "$(cat PROMPT.md)" 2>&1)

# Check that tests actually ran and passed
if ! echo "$OUTPUT" | grep -q "Tests:.*passing"; then
  echo "Warning: Tests may not have run"
fi
```

---

## Safety Checklist

### Before Running AFK

- [ ] Working in a git-tracked directory
- [ ] All changes committed (clean starting state)
- [ ] MAX_ITERATIONS set appropriately
- [ ] Running in sandboxed environment (Docker/VM)
- [ ] API rate limits configured
- [ ] Notification set up for completion

### After AFK Run

- [ ] Review ALL generated code
- [ ] Check git diff for unexpected changes
- [ ] Run full test suite manually
- [ ] Treat output like any PR - review before merge

---

## Advanced Patterns

### Parallel Feature Development

```markdown
## Current Features (Parallel)

### Feature A: Authentication
- Status: In Progress (Iteration 5)
- Branch: feature/auth

### Feature B: Dashboard UI
- Status: Planning Complete
- Branch: feature/dashboard

Run independently - no dependencies between them.
```

### Multi-Agent Orchestration

```bash
# Run multiple loops for independent features
tmux new-session -d -s auth 'cd feature-auth && ./loop.sh'
tmux new-session -d -s dashboard 'cd feature-dashboard && ./loop.sh'

# Monitor both
tmux attach -t auth
```

### Dependency Chains

```markdown
## Task Dependencies

| Task | Depends On | Status |
|------|-----------|--------|
| User Model | - | ✅ Done |
| Auth Routes | User Model | ✅ Done |
| Auth Middleware | Auth Routes | 🔄 Current |
| Protected Routes | Auth Middleware | ⏳ Blocked |
```

---

## Loop Scripts

### Basic loop.sh

```bash
#!/bin/bash
set -e

MAX_ITERATIONS=${1:-30}
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  echo ""
  echo "=========================================="
  echo "Iteration $((ITERATION + 1)) of $MAX_ITERATIONS"
  echo "=========================================="

  claude --print "$(cat PROMPT.md)"

  # Check PROGRESS.md for completion
  if grep -q "ALL_COMPLETE" PROGRESS.md; then
    echo "All tasks completed!"
    exit 0
  fi

  ITERATION=$((ITERATION + 1))
done

echo "Reached max iterations"
```

### Production loop.sh

```bash
#!/bin/bash
set -e

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-30}
RATE_LIMIT_SECONDS=${RATE_LIMIT_SECONDS:-5}
LOG_FILE="ralph_$(date +%Y%m%d_%H%M%S).log"

# State
ITERATION=0
CONSECUTIVE_ERRORS=0
MAX_CONSECUTIVE_ERRORS=3

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
  log "Loop terminated at iteration $ITERATION"
}
trap cleanup EXIT

log "Starting Ralph Loop (max: $MAX_ITERATIONS iterations)"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  log "=== Iteration $ITERATION ==="

  # Run Claude
  if OUTPUT=$(claude --print "$(cat PROMPT.md)" 2>&1); then
    echo "$OUTPUT" >> "$LOG_FILE"
    CONSECUTIVE_ERRORS=0

    # Check for completion
    if echo "$OUTPUT" | grep -qE "(COMPLETE|ALL_DONE)"; then
      log "Task completed successfully!"
      exit 0
    fi

    # Check for human needed
    if echo "$OUTPUT" | grep -qE "(BLOCKED|NEED_HUMAN)"; then
      log "Human intervention required"
      echo "$OUTPUT" | grep -E "(BLOCKED|NEED_HUMAN)"
      exit 1
    fi

  else
    CONSECUTIVE_ERRORS=$((CONSECUTIVE_ERRORS + 1))
    log "Error in iteration (consecutive: $CONSECUTIVE_ERRORS)"

    if [ $CONSECUTIVE_ERRORS -ge $MAX_CONSECUTIVE_ERRORS ]; then
      log "Circuit breaker: Too many consecutive errors"
      exit 1
    fi
  fi

  # Rate limiting
  sleep $RATE_LIMIT_SECONDS
done

log "Reached maximum iterations"
exit 1
```

---

## Integration Examples

### GitHub Actions

```yaml
name: Ralph Loop

on:
  workflow_dispatch:
    inputs:
      max_iterations:
        description: 'Maximum iterations'
        default: '20'

jobs:
  ralph:
    runs-on: ubuntu-latest
    timeout-minutes: 120

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run Ralph Loop
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          MAX_ITERATIONS: ${{ inputs.max_iterations }}
        run: |
          npm install -g @anthropic-ai/claude-code
          chmod +x .ralph/loop.sh
          .ralph/loop.sh

      - name: Create PR with changes
        if: success()
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'feat: Ralph Loop automated changes'
          body: 'Automated changes from Ralph Loop run'
          branch: ralph-changes-${{ github.run_id }}
```

### Docker Sandbox

```dockerfile
# Dockerfile.ralph
FROM node:20-slim

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app
COPY . .

# Run as non-root
RUN useradd -m ralph
USER ralph

CMD [".ralph/loop.sh"]
```

```bash
# Run sandboxed
docker build -f Dockerfile.ralph -t ralph-runner .
docker run --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd):/app \
  ralph-runner
```

---

## Troubleshooting

### Loop Never Exits

**Cause:** Completion signal not being generated

**Fix:** Add explicit output requirements to PROMPT.md:
```markdown
When all tasks are complete, you MUST output exactly:
COMPLETE: All tasks finished successfully
```

### Loop Exits Too Early

**Cause:** False positive on completion detection

**Fix:** Use dual-condition exit (multiple indicators required)

### Same Changes Every Iteration

**Cause:** PROGRESS.md not being updated

**Fix:** Verify the prompt explicitly requires updating PROGRESS.md:
```markdown
CRITICAL: After completing any task, you MUST update PROGRESS.md
before outputting CONTINUE.
```

### Context Getting Confused

**Cause:** Context window filling with irrelevant info

**Fix:** Keep files focused, use fresh iterations:
- PROGRESS.md: Only current state, not full history
- PROMPT.md: Short and specific (<100 lines)
- Archive old session logs

---

## Best Practices

### DO

- Start with HITL, graduate to AFK
- Cap iterations (always)
- Run in sandboxed environments
- Use backpressure (tests, lints, type checks)
- Commit frequently (one task = one commit)
- Keep PROGRESS.md as source of truth
- Review all generated code

### DON'T

- Run infinite loops without caps
- Skip the planning phase
- Trust output without validation
- Forget to update PROGRESS.md
- Let context windows overflow
- Run on production systems

---

## Resources

- [awesome-ralph](https://github.com/snwfdhmp/awesome-ralph) - Curated resource list
- [ralph-claude-code](https://github.com/frankbria/ralph-claude-code) - Production-ready implementation
- [Everything is a Ralph Loop](https://ghuntley.com/loop/) - Geoffrey Huntley's philosophy

---

## License

This methodology is open source. Use freely in your projects.
