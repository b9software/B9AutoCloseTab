import { type ExtensionContext, window, workspace } from 'vscode';
import { APP_NAME } from './config';
import { Engine } from './editor-engine';
import { AutoCloseManager } from './manager';
import { logInfo } from './utils';

export function activate(context: ExtensionContext) {
	logInfo(`${APP_NAME} is activating...`);
	const autoCloseManager = AutoCloseManager.shared;

	context.subscriptions.push(
		autoCloseManager,
		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(APP_NAME)) {
				autoCloseManager.setNeedClose();
			}
		}),
		window.tabGroups.onDidChangeTabs(() => {
			autoCloseManager.setNeedClose();
		}),
		window.tabGroups.onDidChangeTabGroups(() => {
			autoCloseManager.setNeedClose();
		}),
	);
	autoCloseManager.setNeedClose();
}

export function deactivate() {
	logInfo(`${APP_NAME} is deactivating...`);
	Engine.shared.deactivate();
}
