import type { Tab, TabGroup } from 'vscode';
import { TabInputTerminal, TabInputWebview, window } from 'vscode';
import { ConfigManager } from './config';
import { Engine } from './editor-engine';
import { logDebug } from './utils';

export class AutoCloseManager {
	static get shared(): AutoCloseManager {
		if (!AutoCloseManager._instance) {
			AutoCloseManager._instance = new AutoCloseManager();
		}
		return AutoCloseManager._instance;
	}
	private static _instance: AutoCloseManager;

	private _needClose = false;
	private _timeout: NodeJS.Timeout | undefined;
	private _tabOpenTimes = new Map<string, number>();

	private constructor() {}

	setNeedClose(): void {
		if (this._needClose) return;
		this._needClose = true;

		this._timeout = setTimeout(async () => {
			if (!this._needClose) return;
			await this.performClose();
			this._needClose = false;
			this._timeout = undefined;
		}, 300);
	}

	private async performClose(): Promise<void> {
		logDebug('On performClose');
		for (const group of window.tabGroups.all) {
			await this.closeExcessTabsInGroup(group);
		}
		this.updateTracking();
		this.debugTracking();
	}

	private async closeExcessTabsInGroup(group: TabGroup): Promise<void> {
		const maxTabs = ConfigManager.maxTabCount;

		// Update time records while processing the group - only track supported tabs
		const groupTabs: { tab: Tab; tabKey: string; openTime: number }[] = [];

		for (const tab of group.tabs) {
			const tabKey = this.getTabKey(group, tab);
			if (!tabKey) continue; // Skip untrackable

			const openTime = this._tabOpenTimes.get(tabKey);
			if (!openTime) {
				this._tabOpenTimes.set(tabKey, Date.now());
			}
			groupTabs.push({ openTime: openTime ?? Date.now(), tab, tabKey });
		}

		if (groupTabs.length <= maxTabs) {
			return;
		}

		const closableTabs = groupTabs.filter(({ tab }) => {
			return !tab.isActive && !tab.isDirty && !tab.isPinned;
		});

		logDebug(
			`Group ${this.getGroupId(group)}: ${groupTabs.length} total tabs, ${closableTabs.length} closable, max allowed: ${maxTabs}`,
		);

		if (!closableTabs.length) {
			logDebug(`No closable in group ${this.getGroupId(group)}`);
			return;
		}

		const totalTabs = groupTabs.length;
		const tabsToCloseCount = totalTabs - maxTabs;
		const actualTabsToClose = Math.min(tabsToCloseCount, closableTabs.length);

		if (actualTabsToClose <= 0) {
			logDebug(`No tabs to close in group ${this.getGroupId(group)}`);
			return;
		}

		// Sort closable tabs by open time (oldest first)
		closableTabs.sort((a, b) => a.openTime - b.openTime);
		const tabsToClose = closableTabs.slice(0, actualTabsToClose).map(({ tab }) => tab);

		logDebug(`Closing ${tabsToClose.length} tabs in group ${this.getGroupId(group)}`);
		await Engine.shared.closeTabs(tabsToClose);
	}

	private updateTracking(): void {
		const currentTabKeys = new Set<string>();

		// Collect all current tab keys
		for (const group of window.tabGroups.all) {
			for (const tab of group.tabs) {
				const tabKey = this.getTabKey(group, tab);
				if (tabKey) {
					currentTabKeys.add(tabKey);
				}
			}
		}

		// Remove records for tabs that no longer exist
		for (const [tabKey] of this._tabOpenTimes) {
			if (!currentTabKeys.has(tabKey)) {
				this._tabOpenTimes.delete(tabKey);
			}
		}

		logDebug(`Cleaned up tab records, ${this._tabOpenTimes.size} tabs tracked`);
	}

	private getGroupId(group: TabGroup): string {
		return `group-${group.viewColumn || 1}`;
	}

	private getTabKey(group: TabGroup, tab: Tab): string | undefined {
		const groupId = this.getGroupId(group);
		const input = tab.input as object;
		if (input instanceof TabInputTerminal || input instanceof TabInputWebview) {
			return undefined;
		}
		if (input && 'uri' in input) {
			return `${groupId}/U:${input.uri}`;
		}
		return `${groupId}/L:${tab.label}`;
	}

	private debugTracking(): void {
		if (DEBUG) {
			for (const [tabKey, time] of this._tabOpenTimes) {
				const formattedTime = new Date(time).toLocaleString();
				logDebug(`Tab: ${tabKey}, Opened at: ${formattedTime}`);
			}
		}
	}

	dispose(): void {
		if (this._timeout) {
			clearTimeout(this._timeout);
			this._timeout = undefined;
		}
		this._tabOpenTimes.clear();
	}
}
