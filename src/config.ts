import { type WorkspaceConfiguration, workspace } from 'vscode';

export const APP_NAME = 'B9AutoCloseTab';

export class ConfigManager {
	static get shared(): ConfigManager {
		if (!ConfigManager._instance) {
			ConfigManager._instance = new ConfigManager();
		}
		return ConfigManager._instance;
	}
	private static _instance: ConfigManager;

	static get maxTabCount(): number {
		return ConfigManager.shared._config.get('maxTabs', 7);
	}

	private _config: WorkspaceConfiguration;
	private constructor() {
		this._config = workspace.getConfiguration(APP_NAME);
	}
}
