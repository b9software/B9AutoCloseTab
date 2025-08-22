import * as vscode from 'vscode';
import { Engine } from './editor-engine';
import { logInfo } from './utils';

export function activate(context: vscode.ExtensionContext) {
	logInfo('RENAME_APP extension is activating...');

	const exampleCommand = vscode.commands.registerCommand('', () => {
		Engine.alertInfo('Hello world.');
	});

	context.subscriptions.push(exampleCommand);
}

export function deactivate() {
	Engine.shared.deactivate();
}
