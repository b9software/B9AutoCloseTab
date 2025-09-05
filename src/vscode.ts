import { window, workspace } from 'vscode';

export {
	ExtensionContext,
	OutputChannel,
	Tab,
	TabGroup,
	TabInputTerminal,
	TabInputWebview,
	Uri,
	WorkspaceConfiguration,
	window,
	workspace,
} from 'vscode';

export const createOutputChannel = window.createOutputChannel;
export const getConfiguration = workspace.getConfiguration;
export const TabGroups = window.tabGroups;
