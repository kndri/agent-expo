# Agent Operations Guide

This file defines rules and patterns for AI agents working on this project.

## Code Style

- Follow existing patterns in the codebase
- Use consistent naming conventions
- Keep functions small and focused
- Add comments for complex logic only

## Testing

- Write tests for new functionality
- Run existing tests before committing
- Maintain or improve test coverage

## Git Commits

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- One logical change per commit
- Write clear, descriptive commit messages

## File Organization

- Keep related code together
- Follow existing directory structure
- Don't create unnecessary abstractions

## Dependencies

- Don't add new dependencies without explicit approval
- Don't upgrade existing dependencies
- Don't modify package.json/lock files

## What NOT to Do

- Don't modify configuration files without approval
- Don't change CI/CD pipelines
- Don't alter deployment scripts
- Don't skip tests to make progress
- Don't leave debug code or console.logs
- Don't modify unrelated files

## Error Handling

- Handle errors gracefully
- Provide meaningful error messages
- Don't swallow errors silently

## Documentation

- Update README if adding user-facing features
- Add JSDoc for public APIs
- Keep comments up to date with code changes
