import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let pythonProcess: cp.ChildProcess | null = null;
let requestManager: PythonRequestManager | null = null;

interface PendingRequest {
    id: number;
    resolve: (value: string) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
}

class PythonRequestManager {
    private pendingRequests = new Map<number, PendingRequest>();
    private requestId = 1;

    constructor(private process: cp.ChildProcess) {
        // Set up single data handler for all requests
        if (this.process.stdout) {
            this.process.stdout.on('data', this.handleResponse.bind(this));
        }
    }

    private handleResponse(data: Buffer) {
        try {
            const rawData = data.toString();
            console.log('Raw Python response:', rawData);

            const response = JSON.parse(rawData);
            console.log('Parsed Python response:', response);

            const pendingRequest = this.pendingRequests.get(response.id);

            if (pendingRequest) {
                clearTimeout(pendingRequest.timeout);
                this.pendingRequests.delete(response.id);

                if (response.result !== undefined) {
                    pendingRequest.resolve(response.result);
                } else if (response.error) {
                    pendingRequest.reject(response.error);
                } else {
                    pendingRequest.reject('No result or error in response');
                }
            } else {
                console.warn('Received response for unknown request ID:', response.id);
            }
        } catch (error) {
            console.error('Failed to parse Python response:', error, 'Raw data:', data.toString());
        }
    }

    sendRequest(method: string, params: any, timeoutMs = 3000): Promise<string> {
        return new Promise((resolve, reject) => {
            const id = this.requestId++;
            const request = {
                jsonrpc: '2.0',
                id: id,
                method: method,
                params: params
            };

            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                console.error(`Request ${id} (${method}) timed out after ${timeoutMs}ms`);
                reject(new Error(`Request ${id} (${method}) timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            // Store pending request
            this.pendingRequests.set(id, { id, resolve, reject, timeout });

            // Send request
            if (this.process.stdin) {
                console.log('Sending Python request:', request);
                this.process.stdin.write(JSON.stringify(request) + '\n');
            } else {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject('Python process stdin not available');
            }
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
	// Register webview view provider
	const provider = new PythonWebviewViewProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'pythonExtension.sidebarView',
			provider
		)
	);

	// Keep existing command for backward compatibility
	let disposable = vscode.commands.registerCommand('my-python-extension.helloPython', () => {
		vscode.commands.executeCommand('pythonExtension.sidebarView.focus');
	});

	// Add command to open extension in right split (Option B)
	const openRightCommand = vscode.commands.registerCommand('pythonExtension.openRight', async () => {
		try {
			// Split editor to create right column
			await vscode.commands.executeCommand('workbench.action.splitEditor');

			const panel = vscode.window.createWebviewPanel(
				'pythonExtensionRight',
				'Python Extension',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [context.extensionUri],
					retainContextWhenHidden: true
				}
			);

			panel.webview.html = provider.getWebviewContent();
			panel.webview.onDidReceiveMessage(
				message => provider.handleWebviewMessage(message, panel),
				undefined,
				context.subscriptions
			);
		} catch (error) {
			console.error('Error opening extension on right side:', error);
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(openRightCommand);
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
		requestManager = null; // Clear request manager when process exits
	});

	return pythonProcess;
}

function getRequestManager(context: vscode.ExtensionContext): PythonRequestManager {
	if (!requestManager || !pythonProcess || pythonProcess.killed) {
		// Reset both if either is invalid
		requestManager = null;
		const process = startPythonProcess(context);
		requestManager = new PythonRequestManager(process);
	}
	return requestManager;
}

function sendToPython(method: string, params: any, context: vscode.ExtensionContext): Promise<string> {
	const manager = getRequestManager(context);
	return manager.sendRequest(method, params, 10000); // 10 second timeout for path processing
}

class PythonWebviewViewProvider implements vscode.WebviewViewProvider {
	constructor(private context: vscode.ExtensionContext) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri]
		};

		webviewView.webview.html = this.getWebviewContent();

		// Preserve existing message handling
		webviewView.webview.onDidReceiveMessage(
			message => this.handleWebviewMessage(message, webviewView),
			undefined,
			this.context.subscriptions
		);
	}

	getWebviewContent(): string {
		const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
		return fs.readFileSync(htmlPath, 'utf8');
	}

	async handleWebviewMessage(message: any, webviewOrPanel: vscode.WebviewView | vscode.WebviewPanel) {
		// Preserve existing message handling logic
		switch (message.command) {
			case 'sayHello':
				try {
					const result = await sendToPython('say_hello', message.params, this.context);
					webviewOrPanel.webview.postMessage({
						type: 'result',
						data: result
					});
				} catch (error) {
					webviewOrPanel.webview.postMessage({
						type: 'error',
						data: `Error: ${error}`
					});
				}
				break;
			case 'processPath':
				try {
					const result = await sendToPython('process_path', message.params, this.context);
					webviewOrPanel.webview.postMessage({
						type: 'result',
						data: result
					});
				} catch (error) {
					webviewOrPanel.webview.postMessage({
						type: 'error',
						data: `Error processing path: ${error}`
					});
				}
				break;
		}
	}
}
    
export function deactivate() {
	if (pythonProcess && !pythonProcess.killed) {
		pythonProcess.kill();
		pythonProcess = null;
	}
	requestManager = null;
}
