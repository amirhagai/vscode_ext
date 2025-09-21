# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that demonstrates TypeScript frontend communicating with a Python backend via JSON-RPC over stdin/stdout. The extension provides a "Hello Python" command that spawns a Python process, sends a JSON-RPC request, and displays the response.

## Architecture

The project has two main components:

### Frontend (TypeScript)
- `src/extension.ts`: Main extension entry point with command registration and Python process management
- Uses VS Code Extension API to register commands and show messages
- Spawns Python subprocess using `child_process.spawn()`
- Communicates via JSON-RPC protocol over stdin/stdout

### Backend (Python)
- `backend.py`: JSON-RPC server that reads from stdin and writes responses to stdout
- Implements a simple "say_hello" method
- Logs all activity to `backend.log` for debugging
- Uses stdin polling loop to handle multiple requests

## Development Commands

### Build and Compilation
```bash
npm run compile          # Compile TypeScript to JavaScript
npm run watch           # Watch mode compilation
npm run vscode:prepublish # Prepare for publishing (runs compile)
```

### Code Quality
```bash
npm run lint            # Run ESLint on src/ directory
npm run pretest         # Run compile + lint before testing
```

### Testing
```bash
npm run test            # Run VS Code extension tests using vscode-test
```

## Development Workflow

1. **Build**: Use `npm run watch` during development for automatic compilation
2. **Testing**: Run `F5` in VS Code to launch Extension Development Host, or use `npm run test` for automated tests
3. **Debugging**: Check `backend.log` for Python backend debugging information

## Key Files

- `package.json`: Extension manifest with commands, activation events, and scripts
- `tsconfig.json`: TypeScript configuration targeting ES2022 with Node16 modules
- `eslint.config.mjs`: ESLint configuration with TypeScript-specific rules
- `.vscode/launch.json`: VS Code debug configuration for extension development
- `.vscode/tasks.json`: Build task configuration
- `.vscode-test.mjs`: Test runner configuration

## Extension Structure

The extension activates on the `my-python-extension.helloPython` command and contributes:
- Command palette entry: "Hello Python"
- Editor title bar button with play icon
- Spawns `backend.py` with `python3` and communicates via JSON-RPC

## Communication Protocol

Frontend and backend communicate using JSON-RPC 2.0:
```typescript
// Request format
{
  jsonrpc: '2.0',
  id: 1,
  method: 'say_hello',
  params: { name: 'from VSCode' }
}

// Response format
{
  jsonrpc: '2.0',
  id: 1,
  result: 'Hello, from VSCode!'
}
```