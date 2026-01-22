# Ralph Loop Template

Copy this template to any project to enable autonomous AI-driven development.

## Quick Setup

```bash
# Copy template to your project
cp -r .ralph-template/* /path/to/your/project/

# Make loop script executable
chmod +x /path/to/your/project/.ralph/loop.sh

# Initialize
cd /path/to/your/project
git add .
git commit -m "chore: add Ralph Loop configuration"
```

## Files Included

```
.ralph-template/
├── .ralph/
│   ├── PROMPT.md        # Main loop instructions
│   ├── PROMPT_plan.md   # Planning phase prompt
│   └── loop.sh          # Autonomous loop script
├── PROGRESS.md          # State tracking
├── AGENTS.md            # AI behavior rules
├── specs/
│   └── example-feature.md  # Sample spec template
└── README.md            # This file (delete after setup)
```

## Usage

### 1. Define Your Requirements

Edit `specs/example-feature.md` or create new spec files:

```bash
# Rename and edit the example
mv specs/example-feature.md specs/my-feature.md
```

### 2. Run Planning Phase (Optional)

```bash
# Have AI create implementation plan
claude --print "$(cat .ralph/PROMPT_plan.md)"
```

### 3. Run Development Loop

**HITL Mode (Recommended to start):**
```bash
# Run one iteration at a time
claude --print "$(cat .ralph/PROMPT.md)"

# Review changes
git diff

# Run again if satisfied
```

**AFK Mode (Once confident):**
```bash
# Run autonomous loop
.ralph/loop.sh

# Or with custom max iterations
.ralph/loop.sh 50

# Or via environment variable
MAX_ITERATIONS=100 .ralph/loop.sh
```

### 4. Monitor Progress

```bash
# Check current state
cat PROGRESS.md

# View logs
tail -f .ralph/logs/ralph_*.log

# Check git history
git log --oneline -10
```

## Customization

### Adjust Loop Behavior

Edit `.ralph/loop.sh` to modify:
- `MAX_ITERATIONS` - Safety cap (default: 30)
- `RATE_LIMIT_SECONDS` - Delay between iterations (default: 5)
- `MAX_CONSECUTIVE_ERRORS` - Circuit breaker threshold (default: 3)

### Customize Prompts

Edit `.ralph/PROMPT.md` to:
- Add project-specific validation commands
- Change output signal keywords
- Add additional context files

### Add Project Rules

Edit `AGENTS.md` to define:
- Code style requirements
- Testing expectations
- Files/patterns to avoid

## Safety Reminders

- Always run in a git-tracked directory
- Start with HITL mode before going AFK
- Cap iterations appropriately
- Review all generated code before merging
- Run in sandboxed environments for AFK

## Cleanup

After setup, you can delete this README:
```bash
rm README.md  # The template README, not your project's
```
