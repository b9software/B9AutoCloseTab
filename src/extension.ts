import { APP_NAME, reloadConfig } from './config';
import { releaseOutputChannel } from './editor-engine';
import { AutoCloseManager } from './manager';
import { logInfo } from './utils';
import { type ExtensionContext, TabGroups, workspace } from './vscode';

export function activate(context: ExtensionContext) {
	logInfo(`${APP_NAME} is activating...`);
	const autoCloseManager = AutoCloseManager.shared;

	context.subscriptions.push(
		autoCloseManager,
		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(APP_NAME)) {
				reloadConfig();
				autoCloseManager.setNeedClose();
			}
		}),
		TabGroups.onDidChangeTabs(() => {
			autoCloseManager.setNeedClose();
		}),
		TabGroups.onDidChangeTabGroups(() => {
			autoCloseManager.setNeedClose();
		}),
	);
	autoCloseManager.setNeedClose();
}

export function deactivate() {
	logInfo(`${APP_NAME} is deactivating...`);
	releaseOutputChannel();
}
