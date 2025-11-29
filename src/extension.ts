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
		TabGroups.onDidChangeTabs((e) => {
			// Track tab activation for LRU closing
			for (const tab of e.changed) {
				if (tab.isActive) {
					const group = TabGroups.all.find((g) => g.tabs.includes(tab));
					if (group) {
						autoCloseManager.updateTabActivation(group, tab);
					}
				}
			}
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
