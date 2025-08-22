import * as vscode from 'vscode';
import { Engine } from './editor-engine';
import { logInfo } from './utils';

export function activate(context: vscode.ExtensionContext) {
	logInfo('B9AutoCloseTab is activating...');

}

export function deactivate() {
	Engine.shared.deactivate();
}
