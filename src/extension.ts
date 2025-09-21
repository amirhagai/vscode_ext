import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let pythonProcess: cp.ChildProcess | null = null;

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('my-python-extension.helloPython', () => {
		const panel = vscode.window.createWebviewPanel(
			'pythonExtensionView',
			'Python Extension',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
				retainContextWhenHidden: true
			}
		);

		panel.webview.html = getWebviewContent();

		// Message handling setup
		panel.webview.onDidReceiveMessage(
			message => handleWebviewMessage(message, panel, context),
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}

function startPythonProcess(context: vscode.ExtensionContext): cp.ChildProcess {
	if (pythonProcess && !pythonProcess.killed) {
		return pythonProcess;
	}

	const scriptPath = path.join(context.extensionPath, 'backend.py');
	pythonProcess = cp.spawn('python3', [scriptPath]);

	// Set up error handling
	if (pythonProcess.stderr) {
		pythonProcess.stderr.on('data', (data) => {
			console.error(`Python backend error: ${data}`);
		});
	}

	pythonProcess.on('exit', (code) => {
		console.log(`Python process exited with code ${code}`);
		pythonProcess = null;
	});

	return pythonProcess;
}

function sendToPython(method: string, params: any, context: vscode.ExtensionContext): Promise<string> {
	return new Promise((resolve, reject) => {
		const process = startPythonProcess(context);

		const request = {
			jsonrpc: '2.0',
			id: Date.now(),
			method: method,
			params: params
		};

		// Set up response handler
		const dataHandler = (data: Buffer) => {
			try {
				const response = JSON.parse(data.toString());
				if (process.stdout) {
					process.stdout.removeListener('data', dataHandler);
				}

				if (response.result !== undefined) {
					resolve(response.result);
				} else if (response.error) {
					reject(response.error);
				} else {
					reject('No result or error in response');
				}
			} catch (error) {
				reject(`Failed to parse response: ${error}`);
			}
		};

		if (process.stdout) {
			process.stdout.on('data', dataHandler);
		} else {
			reject('Python process stdout not available');
			return;
		}

		// Send request
		if (process.stdin) {
			process.stdin.write(JSON.stringify(request) + '\n');
		} else {
			reject('Python process stdin not available');
		}
	});
}

async function handleWebviewMessage(message: any, panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
	switch (message.command) {
		case 'sayHello':
			try {
				const result = await sendToPython('say_hello', message.params, context);
				panel.webview.postMessage({
					type: 'result',
					data: result
				});
			} catch (error) {
				panel.webview.postMessage({
					type: 'error',
					data: `Error: ${error}`
				});
			}
			break;
	}
}
    
export function deactivate() {
	if (pythonProcess && !pythonProcess.killed) {
		pythonProcess.kill();
		pythonProcess = null;
	}
}
