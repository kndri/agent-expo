# The Ralph Loop Pattern

A modular, AI-driven development methodology for iterative feature development across sessions.

## Overview

The Ralph Loop is a structured approach for AI-assisted development that enables:
- **Continuity** between AI sessions (context survives session boundaries)
- **Progress tracking** with clear milestones and completion criteria
- **Autonomous execution** with human checkpoints
- **Reproducibility** through documented patterns

Named after the iterative "loop" pattern where an AI agent continuously works through features until a project reaches completion.

---

## Quick Start

### 1. Initialize Your Project

Create these files in your repository:

```
your-project/
├── PROGRESS.md      # State tracking between sessions
├── RALPH_LOOP.md    # This documentation (optional)
└── .github/
    └── ISSUE_TEMPLATE/
        └── feature.md  # Feature issue template
```

### 2. The Loop Prompt

Use this prompt to start or continue development:

```
Read PROGRESS.md to understand current state.
Work on the current feature until all tasks are complete.
When done, update PROGRESS.md and move to the next feature.
```

### 3. Watch It Work

The AI will:
1. Read `PROGRESS.md` to understand context
2. Check the GitHub issue for the current feature
3. Implement until the feature is complete
4. Update `PROGRESS.md` with a session summary
5. Close the issue and move to the next feature

---

## Core Components

### 1. PROGRESS.md - The State File

This is the "memory" that persists between AI sessions.

```markdown
# Project Development Progress

This file tracks progress between AI development sessions using the Ralph Loop pattern.

## Current Feature

**Feature Name**: [Feature X: Description]
**Issue**: [#X](link-to-issue)
**Status**: In Progress | Complete | Blocked

## Session Log

### Session YYYY-MM-DD - Feature X: Name

**Completed:**
- Task 1
- Task 2

**In Progress:**
- Task 3 (blocked by X)

**Technical Details:**
- Implementation notes
- Key decisions made

**Next Steps:**
- What to do next session

---

## Feature Milestones

| # | Feature | Issue | Status |
|---|---------|-------|--------|
| 1 | Feature One | [#1](link) | ✅ Complete |
| 2 | Feature Two | [#2](link) | 🔄 In Progress |
| 3 | Feature Three | [#3](link) | ⏳ Pending |

---

## How to Continue Development

When starting a new session, the AI agent should:

1. Read this `PROGRESS.md` file to understand current state
2. Check the GitHub Issue for the current feature
3. Work on tasks until the feature is complete
4. Update this file with session summary
5. Mark issue as closed and move to the next feature

### Completion Criteria

A feature is complete when:
- All tasks in the GitHub issue are checked off
- Tests pass (if applicable)
- The feature works end-to-end
- PROGRESS.md is updated
- GitHub issue is closed
```

### 2. GitHub Issues - Feature Definitions

Each feature should have a detailed GitHub issue:

```markdown
## Feature: [Name]

### Description
Clear description of what this feature accomplishes.

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Technical Requirements
- Requirement 1
- Requirement 2

### Implementation Notes
Any guidance for implementation.

### Testing
How to verify this feature works.
```

### 3. Session Summaries

After each session, document what happened:

```markdown
### Session YYYY-MM-DD - Feature X: Name

**Completed:**
- List of completed tasks

**Technical Details:**
- Key implementation decisions
- Code patterns used
- Dependencies added

**Files Changed:**
- `path/to/file.ts` - Description of changes

**Verification:**
- How the feature was tested
- Commands to verify

**Blockers/Issues:**
- Any problems encountered
- How they were resolved
```

---

## Implementation Guide

### Step 1: Plan Your Features

Before starting, create a feature roadmap:

```bash
# Example: Create issues for a new project
gh issue create --title "Feature 1: Core Setup" --body "..."
gh issue create --title "Feature 2: Main Functionality" --body "..."
gh issue create --title "Feature 3: Polish & Testing" --body "..."
```

### Step 2: Initialize PROGRESS.md

Create the initial state file:

```markdown
# Project Development Progress

## Current Feature

**Feature 1: Core Setup**

## Feature Milestones

| # | Feature | Issue | Status |
|---|---------|-------|--------|
| 1 | Core Setup | #1 | 🔄 In Progress |
| 2 | Main Functionality | #2 | ⏳ Pending |
| 3 | Polish & Testing | #3 | ⏳ Pending |
```

### Step 3: Run the Loop

Start each AI session with:

```
Read PROGRESS.md and continue the Ralph Loop.
```

Or for more control:

```
Read PROGRESS.md to understand current state.
Work on Feature [X] until complete.
Update PROGRESS.md when done.
Do not proceed to the next feature without confirmation.
```

### Step 4: Review and Iterate

After each feature:
1. Review the AI's work
2. Test the implementation
3. Provide feedback if needed
4. Confirm to proceed to next feature

---

## Advanced Patterns

### Parallel Features

For independent features that can be developed simultaneously:

```markdown
## Current Features (Parallel)

- **Feature 2A**: API Layer (Issue #2)
- **Feature 2B**: UI Components (Issue #3)

Both can be worked on independently.
```

### Feature Dependencies

Document dependencies explicitly:

```markdown
## Feature Milestones

| # | Feature | Depends On | Status |
|---|---------|------------|--------|
| 1 | Database Schema | - | ✅ |
| 2 | API Layer | #1 | 🔄 |
| 3 | UI Components | #1 | ⏳ |
| 4 | Integration | #2, #3 | ⏳ |
```

### Blocked Features

When a feature is blocked:

```markdown
### Session 2024-01-15 - Feature 3: Integration

**Status:** BLOCKED

**Blocker:**
- Waiting for external API access
- Need decision on authentication method

**Can Resume When:**
- API credentials are provided
- Auth decision is made

**Skipping to:** Feature 4 (independent)
```

### Skip Patterns

To skip a feature:

```markdown
### Session 2024-01-15 - Feature 3: Android Support ⏭️ SKIPPED

**Reason:** User requested to skip - not needed for MVP
**Can revisit:** After v1.0 release
```

---

## Best Practices

### DO

✅ Keep PROGRESS.md updated after every session
✅ Write detailed session summaries
✅ Include technical details for context
✅ Document decisions and their rationale
✅ List verification steps for each feature
✅ Use clear completion criteria

### DON'T

❌ Leave PROGRESS.md outdated
❌ Skip session summaries
❌ Assume context will be remembered
❌ Leave features partially complete without notes
❌ Forget to close GitHub issues

---

## Templates

### Feature Issue Template

```markdown
---
name: Feature Request
about: Ralph Loop feature definition
title: 'Feature [X]: [Name]'
labels: feature, ralph-loop
---

## Description
<!-- What does this feature do? -->

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Approach
<!-- How should this be implemented? -->

## Testing
<!-- How to verify this works? -->

## Dependencies
<!-- What must be done first? -->
```

### Session Summary Template

```markdown
### Session YYYY-MM-DD - Feature X: Name

**Status:** ✅ Complete | 🔄 In Progress | ⏸️ Blocked

**Completed:**
-

**In Progress:**
-

**Technical Details:**
-

**Files Changed:**
-

**Blockers:**
-

**Next Steps:**
-
```

---

## Integration with CI/CD

### Automated Progress Checks

Add a GitHub Action to validate PROGRESS.md:

```yaml
name: Ralph Loop Check

on:
  pull_request:
    paths:
      - 'PROGRESS.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check PROGRESS.md format
        run: |
          # Validate required sections exist
          grep -q "## Current Feature" PROGRESS.md
          grep -q "## Session Log" PROGRESS.md
          grep -q "## Feature Milestones" PROGRESS.md
```

### Issue Automation

Auto-update milestones when issues close:

```yaml
name: Update Milestones

on:
  issues:
    types: [closed]

jobs:
  update:
    if: contains(github.event.issue.labels.*.name, 'ralph-loop')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update PROGRESS.md
        run: |
          # Script to mark feature as complete
          echo "Issue #${{ github.event.issue.number }} closed"
```

---

## Troubleshooting

### AI Loses Context

**Problem:** AI doesn't remember previous work.

**Solution:** Ensure PROGRESS.md has detailed session summaries with:
- Specific file paths changed
- Technical decisions made
- Current state of implementation

### Feature Scope Creep

**Problem:** Features keep expanding.

**Solution:**
- Define clear acceptance criteria upfront
- Create new issues for additional scope
- Mark original feature complete when criteria met

### Stuck in a Loop

**Problem:** AI keeps redoing the same work.

**Solution:**
- Add explicit "Completed" checkboxes
- Document verification steps
- Include "do not repeat" notes for solved issues

---

## Example Projects Using Ralph Loop

1. **agent-expo** - React Native testing framework
   - 7 features completed across multiple sessions
   - Full audit and documentation

2. **Your Project Here**
   - Submit a PR to add your project!

---

## Contributing

To improve this pattern:

1. Fork the repository
2. Document your improvements
3. Submit a PR with your learnings

---

## License

This pattern is open source. Use it freely in your projects.
