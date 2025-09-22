# Python Extension for VS Code

A VS Code extension that provides a visual interface for communicating with Python backends via JSON-RPC.

## Features

- **Sidebar Interface**: Persistent Python interaction panel in VS Code sidebar
- **JSON-RPC Communication**: Reliable communication with Python backend processes
- **Path Processing**: Input and process file paths through visual interface
- **VS Code Integration**: Native theming and UI consistency

## Requirements

- VS Code 1.102.0 or higher
- Python 3.x installed and accessible via `python3` command

## Usage

1. Open VS Code
2. Click the Python Extension icon in the activity bar
3. Use the sidebar interface to interact with Python backend:
   - Click "Say Hello" for basic communication test
   - Enter file paths and click "Process Path" to send paths to backend

## Extension Settings

This extension contributes no settings currently.

## Known Issues

- Python process must be manually restarted if it crashes
- File path validation is performed client-side only

## Release Notes

### 0.0.1

Initial release with sidebar view and Python backend communication.