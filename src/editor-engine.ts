import type { OutputChannel, Tab } from 'vscode';
import { window } from 'vscode';
import { APP_NAME } from './config';
import { logError } from './utils';

export class Engine {
	static get shared(): Engine {
		if (!Engine._instance) {
			Engine._instance = new Engine();
		}
		return Engine._instance;
	}
	private static _instance: Engine;

	// MARK: Log

	static alertInfo(message: string) {
		window.showInformationMessage(message);
	}
	static alertWarning(message: string) {
		window.showWarningMessage(message);
	}
	static alertError(message: string, error: unknown) {
		window.showErrorMessage(message + formatArg(error));
	}

	static outputLine(message: string, ...args: unknown[]) {
		Engine.shared
			.getOutputChannel()
			.appendLine(message + (args.length > 0 ? ` ${args.map((arg) => formatArg(arg)).join(' ')}` : ''));
	}

	// MARK: Tab Management

	async closeTab(tab: Tab): Promise<void> {
		try {
			await window.tabGroups.close(tab);
			Engine.outputLine(`Close: ${tab.label}`);
		} catch (error) {
			logError('Failed to close tab:', { error, tab: tab.label });
		}
	}

	async closeTabs(tabs: Tab[]) {
		for (const tab of tabs) {
			await this.closeTab(tab);
		}
	}

	deactivate() {
		if (this._outputChannel) {
			this._outputChannel.dispose();
			this._outputChannel = undefined;
		}
	}

	private _outputChannel: OutputChannel | undefined;
	private getOutputChannel(): OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = window.createOutputChannel(APP_NAME);
		}
		return this._outputChannel;
	}
}

function formatArg(arg: unknown): string {
	if (typeof arg === 'string') {
		return arg;
	}
	if (arg instanceof Error) {
		return `${arg.name}: ${arg.message}`;
	}
	try {
		return JSON.stringify(arg, null, 2);
	} catch {
		return String(arg);
	}
}
