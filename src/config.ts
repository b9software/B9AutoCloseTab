import { getConfiguration, type WorkspaceConfiguration } from './vscode';

export const APP_NAME = 'B9AutoCloseTab';

let _config: WorkspaceConfiguration;
function getConfig(): WorkspaceConfiguration {
	if (!_config) {
		_config = getConfiguration(APP_NAME);
	}
	return _config;
}
export function reloadConfig() {
	_config = getConfiguration(APP_NAME);
}

export function getMaxTabCount(): number {
	return getConfig().get('maxTabs', 7);
}
