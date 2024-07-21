import { Moment } from "moment";
import { Store, createStore } from "@/store";
import { TimekeepSettingsTab } from "@/settings-tab";
import { PluginManifest, App as ObsidianApp } from "obsidian";
import { defaultSettings, TimekeepSettings } from "@/settings";
import { Plugin, MarkdownPostProcessorContext } from "obsidian";
import {
	load,
	isKeepRunning,
	isEntryRunning,
	getRunningEntry,
	getEntryDuration,
	getTotalDuration,
	extractTimekeepCodeblocks,
} from "@/timekeep";

import { Timekeep, TimeEntry } from "./schema";
import { TimekeepMarkdownView } from "./views/timekeep-markdown-view";

export default class TimekeepPlugin extends Plugin {
	settingsStore: Store<TimekeepSettings>;

	extractTimekeepCodeblocks: (value: string) => Timekeep[];
	isKeepRunning: (timekeep: Timekeep) => boolean;
	isEntryRunning: (entry: TimeEntry) => boolean;
	getRunningEntry: (entries: TimeEntry[]) => TimeEntry | null;
	getEntryDuration: (entry: TimeEntry, currentTime: Moment) => number;
	getTotalDuration: (entries: TimeEntry[], currentTime: Moment) => number;

	constructor(app: ObsidianApp, manifest: PluginManifest) {
		super(app, manifest);

		const saveSettings = this.saveData.bind(this);

		const settingsStore = createStore(defaultSettings);

		// Subscribe to settings changes to save them
		settingsStore.subscribe(() => {
			saveSettings(settingsStore.getState());
		});

		this.settingsStore = settingsStore;

		// Expose API functions
		this.extractTimekeepCodeblocks = extractTimekeepCodeblocks;
		this.isKeepRunning = isKeepRunning;
		this.isEntryRunning = isEntryRunning;
		this.getRunningEntry = getRunningEntry;
		this.getEntryDuration = getEntryDuration;
		this.getTotalDuration = getTotalDuration;
	}

	async onload(): Promise<void> {
		// Load saved settings and combine with defaults
		this.settingsStore.setState(
			Object.assign({}, defaultSettings, await this.loadData())
		);

		this.addSettingTab(new TimekeepSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(
			"timekeep",
			(
				source: string,
				el: HTMLElement,
				context: MarkdownPostProcessorContext
			) => {
				const loadResult = load(source);

				context.addChild(
					new TimekeepMarkdownView(
						el,
						this.app,
						this.settingsStore,
						context,
						loadResult
					)
				);
			}
		);

		this.addCommand({
			id: `insert`,
			name: `Insert Tracker`,
			editorCallback: (e) => {
				e.replaceSelection('\n```timekeep\n{"entries": []}\n```\n');
			},
		});
	}
}
