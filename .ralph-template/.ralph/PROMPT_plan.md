# Planning Mode Instructions

You are analyzing requirements and creating an implementation plan.

## Your Task

1. **Read Requirements**: Study all files in `specs/` directory
2. **Analyze Codebase**: Understand existing patterns, architecture, and conventions
3. **Identify Tasks**: Break down requirements into atomic, implementable tasks
4. **Order Tasks**: Sequence tasks by dependencies (what must come first)
5. **Create Plan**: Write `IMPLEMENTATION_PLAN.md` with the task list

## Output Format

Create `IMPLEMENTATION_PLAN.md` with this structure:

```markdown
# Implementation Plan

## Overview
Brief description of what will be built.

## Tasks

### Phase 1: Foundation
- [ ] Task 1: Description
  - Files: `path/to/file.ts`
  - Details: What specifically needs to be done

- [ ] Task 2: Description
  - Files: `path/to/file.ts`
  - Depends on: Task 1

### Phase 2: Core Features
...

## Technical Notes
Any architectural decisions or patterns to follow.

## Risks & Considerations
Potential issues to watch for.
```

## Rules

- **DO NOT write any code** - Planning only
- **Be specific** - Each task should be completable in one iteration
- **Consider dependencies** - Order tasks so prerequisites come first
- **Identify files** - List which files each task will touch
- **Keep tasks small** - If a task seems large, break it down further

## When Done

Output: `PLANNING_COMPLETE`

The loop will then switch to building mode with `PROMPT.md`.
