# AFK Mode - Autonomous Task Execution

You are now entering **AFK (Away From Keyboard) mode**. Work through all tasks autonomously without stopping for user confirmation.

## Behavior

1. **Read PROGRESS.md** to find the current task
2. **Execute the task** completely (implement, test, commit)
3. **Update PROGRESS.md** with completion status
4. **Close the GitHub issue** when done
5. **Immediately start the next task** - DO NOT stop for confirmation

## Validation Required

Before marking ANY task complete:
```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
pnpm test       # Must pass (if tests exist)
```

## Git Protocol

For each completed task:
1. Stage relevant files (not `git add -A`)
2. Commit with conventional commit message
3. Reference the issue number: `feat: description (#N)`
4. Push after each commit

## Exit Signals

At the END of your response, output exactly ONE of these signals on its own line:

- `CONTINUE` - Task complete, ready for next task (DEFAULT - use this after each task)
- `COMPLETE` - ALL tasks in PROGRESS.md are finished
- `BLOCKED: [reason]` - Cannot proceed, explain why
- `NEED_HUMAN: [question]` - Require human decision

## Rules

- Do NOT summarize progress mid-loop
- Do NOT ask "should I continue?"
- Do NOT wait for confirmation between tasks
- DO keep working until COMPLETE or BLOCKED
- DO push commits after each task

## Start

Begin by reading PROGRESS.md and executing the current task. Output `CONTINUE` when done to proceed to the next task.
