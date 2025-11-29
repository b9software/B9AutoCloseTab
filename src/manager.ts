import { getMaxTabCount } from './config';
import { closeTabs } from './editor-engine';
import { logDebug } from './utils';
import type { Tab, TabGroup } from './vscode';
import { TabGroups, TabInputTerminal, TabInputWebview } from './vscode';

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
	private _tabLastActiveTimes = new Map<string, number>();

	private constructor() {}

	setNeedClose(): void {
		if (this._needClose) return;
		this._needClose = true;

		this._timeout = setTimeout(async () => {
			if (!this._needClose) return;
			await this._perform();
			this._needClose = false;
			this._timeout = undefined;
		}, 300);
	}

	/**
	 * Update the last active time for a tab when it becomes active
	 */
	updateTabActivation(group: TabGroup, tab: Tab): void {
		const tabKey = this._getTabKey(group, tab);
		if (tabKey) {
			this._tabLastActiveTimes.set(tabKey, Date.now());
			DEBUG && logDebug(`Updated activation time for tab: ${tabKey}`);
		}
	}

	private async _perform(): Promise<void> {
		DEBUG && logDebug('On performClose');
		for (const group of TabGroups.all) {
			await this._closeExcessTabsInGroup(group);
		}
		this._updateTracking();
		DEBUG && this._debugTracking();
	}

	private async _closeExcessTabsInGroup(group: TabGroup): Promise<void> {
		const maxTabs = getMaxTabCount();

		// Update time records while processing the group - only track supported tabs
		const groupTabs: { tab: Tab; tabKey: string; lastActiveTime: number }[] = [];

		for (const tab of group.tabs) {
			const tabKey = this._getTabKey(group, tab);
			if (!tabKey) continue; // Skip untrackable

			const lastActiveTime = this._tabLastActiveTimes.get(tabKey);
			if (!lastActiveTime) {
				this._tabLastActiveTimes.set(tabKey, Date.now());
			}
			groupTabs.push({ lastActiveTime: lastActiveTime ?? Date.now(), tab, tabKey });
		}

		if (groupTabs.length <= maxTabs) {
			return;
		}

		const closableTabs = groupTabs.filter(({ tab }) => {
			return !tab.isActive && !tab.isDirty && !tab.isPinned;
		});

		DEBUG &&
			logDebug(
				`Group ${this._getGroupId(group)}: ${groupTabs.length} total tabs, ${closableTabs.length} closable, max allowed: ${maxTabs}`,
			);

		if (!closableTabs.length) {
			DEBUG && logDebug(`No closable in group ${this._getGroupId(group)}`);
			return;
		}

		const totalTabs = groupTabs.length;
		const tabsToCloseCount = totalTabs - maxTabs;
		const actualTabsToClose = Math.min(tabsToCloseCount, closableTabs.length);

		if (actualTabsToClose <= 0) {
			DEBUG && logDebug(`No tabs to close in group ${this._getGroupId(group)}`);
			return;
		}

		// Sort closable tabs by last active time (least recently used first)
		closableTabs.sort((a, b) => a.lastActiveTime - b.lastActiveTime);

		const tabsToClose = closableTabs.slice(0, actualTabsToClose).map(({ tab }) => tab);

		DEBUG && logDebug(`Closing ${tabsToClose.length} tabs in group ${this._getGroupId(group)}`);
		await closeTabs(tabsToClose);
	}

	private _updateTracking(): void {
		const currentTabKeys = new Set<string>();

		// Collect all current tab keys
		for (const group of TabGroups.all) {
			for (const tab of group.tabs) {
				const tabKey = this._getTabKey(group, tab);
				if (tabKey) {
					currentTabKeys.add(tabKey);
				}
			}
		}

		// Remove records for tabs that no longer exist
		for (const [tabKey] of this._tabLastActiveTimes) {
			if (!currentTabKeys.has(tabKey)) {
				this._tabLastActiveTimes.delete(tabKey);
			}
		}

		DEBUG && logDebug(`Cleaned up tab records, ${this._tabLastActiveTimes.size} tabs tracked`);
	}

	private _getGroupId(group: TabGroup): string {
		return `group-${group.viewColumn || 1}`;
	}

	private _getTabKey(group: TabGroup, tab: Tab): string | undefined {
		const groupId = this._getGroupId(group);
		const input = tab.input as object;
		if (input instanceof TabInputTerminal || input instanceof TabInputWebview) {
			return undefined;
		}
		if (input && 'uri' in input) {
			return `${groupId}/U:${input.uri}`;
		}
		return `${groupId}/L:${tab.label}`;
	}

	private _debugTracking(): void {
		if (DEBUG) {
			for (const [tabKey, time] of this._tabLastActiveTimes) {
				const formattedTime = new Date(time).toLocaleString();
				logDebug(`Tab: ${tabKey}, Last active at: ${formattedTime}`);
			}
		}
	}

	dispose(): void {
		if (this._timeout) {
			clearTimeout(this._timeout);
			this._timeout = undefined;
		}
		this._tabLastActiveTimes.clear();
	}
}
