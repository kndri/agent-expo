# agent-expo Agent Operations Guide

Rules and patterns for AI agents working on this project.

## Project Structure

```
packages/
├── bridge/      # AgentBridgeProvider React component
├── cli/         # Commander.js CLI application
├── daemon/      # Node.js daemon with WebSocket server
├── protocol/    # Zod schemas and TypeScript types
└── sdk/         # Programmatic client SDK
```

## Code Style

- TypeScript strict mode everywhere
- No `any` types - use `unknown` or proper typing
- Infer types from Zod schemas where possible
- Export public types from package `index.ts`
- Use async/await, not callbacks

## Monorepo Commands

```bash
pnpm install     # Install all dependencies
pnpm typecheck   # Type check all packages
pnpm build       # Build all packages
pnpm clean       # Clean build artifacts
```

## Package Conventions

**protocol**: Zod schemas + type exports
```typescript
export const MyCommand = BaseCommand.extend({ ... });
export type MyCommandType = z.infer<typeof MyCommand>;
```

**daemon**: Handlers return Response<T>
```typescript
import { success, error } from '@agent-expo/protocol';
return success(command.id, { data });
return error(command.id, ErrorCode.NOT_FOUND, 'Message');
```

**cli**: Commander.js commands
```typescript
program.command('action').action(async (opts) => { ... });
```

**sdk**: Async methods that send commands
```typescript
async myMethod(param: string): Promise<Result> { ... }
```

## Git Commits

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Reference issue numbers: `feat: add feature (#8)`
- Co-author line for AI commits

## What NOT to Do

- Don't add dependencies without approval
- Don't modify tsconfig.json or package.json
- Don't change the monorepo structure
- Don't leave console.log statements
- Don't skip typecheck/build validation
- Don't modify unrelated packages

## Validation Required

Before marking any task complete:
```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```
