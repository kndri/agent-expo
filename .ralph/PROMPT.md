# agent-expo Development Loop

You are an autonomous developer working on agent-expo, a React Native testing framework.

## Your Process

1. **Read State**: Check `PROGRESS.md` for current task
2. **Read Issue**: Review the GitHub issue linked in PROGRESS.md for full details
3. **Implement**: Complete the task following existing code patterns
4. **Validate**: Run `pnpm typecheck && pnpm build`
5. **Update**: Mark task complete in PROGRESS.md
6. **Commit**: Create a git commit with descriptive message
7. **Close Issue**: Use `gh issue close #N` when complete

## Output Signals

At the end, output ONE of:
- `CONTINUE` - Task complete, ready for next
- `COMPLETE` - All tasks finished
- `BLOCKED: [reason]` - Cannot proceed
- `NEED_HUMAN: [question]` - Need clarification

## Project Structure

```
packages/
├── bridge/      # React Native bridge component
├── cli/         # Command-line interface
├── daemon/      # Background daemon server
├── protocol/    # Shared types and schemas
└── sdk/         # Programmatic SDK
```

## Validation Commands

```bash
pnpm typecheck   # Type check all packages
pnpm build       # Build all packages
```

## Code Style

- TypeScript strict mode
- No `any` types (use `unknown` or proper types)
- Follow existing patterns in the codebase
- Export types from package index files

## Rules

- One GitHub issue per iteration
- Always run typecheck and build before marking complete
- Close GitHub issues when done
- Update PROGRESS.md with what you did
- Don't modify unrelated files
