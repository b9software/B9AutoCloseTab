import { APP_NAME } from './config';
import { logError } from './utils';
import type { OutputChannel, Tab } from './vscode';
import { createOutputChannel, TabGroups, window } from './vscode';

// MARK: Alerts

export function alertInfo(message: string) {
	window.showInformationMessage(message);
}
export function alertWarning(message: string) {
	window.showWarningMessage(message);
}
export function alertError(message: string, error: unknown) {
	window.showErrorMessage(message + formatArg(error));
}

// MARK: Output Channel

let _outputChannel: OutputChannel | undefined;
function getOutputChannel(): OutputChannel {
	if (!_outputChannel) {
		_outputChannel = createOutputChannel(APP_NAME);
	}
	return _outputChannel;
}

export function outputLine(message: string, ...args: unknown[]) {
	getOutputChannel().appendLine(message + (args.length > 0 ? ` ${args.map((arg) => formatArg(arg)).join(' ')}` : ''));
}

export function releaseOutputChannel() {
	if (_outputChannel) {
		_outputChannel.dispose();
		_outputChannel = undefined;
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

// MARK: Tab Management

export async function closeTab(tab: Tab): Promise<void> {
	try {
		await TabGroups.close(tab);
		outputLine(`Close: ${tab.label}`);
	} catch (error) {
		logError('Failed to close tab:', { error, tab: tab.label });
	}
}

export async function closeTabs(tabs: Tab[]) {
	for (const tab of tabs) {
		await closeTab(tab);
	}
}
