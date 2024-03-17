import { Plugin } from "obsidian";
import { TimekeepSettings, defaultSettings } from "./settings";
import { TimekeepSettingsTab } from "./settings-tab";
import { load } from "./timekeep";
import Timesheet from "./components/Timesheet";
import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsContext } from "./hooks/use-settings-context";

export default class TimekeepPlugin extends Plugin {
	settings: TimekeepSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new TimekeepSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("timekeep", (s, e, i) => {
			const reactWrapper = e.createDiv({});
			const root = createRoot(reactWrapper);

			const loadResult = load(s);

			if (loadResult.success) {
				const timekeep = loadResult.timekeep;

				root.render(
					<SettingsContext.Provider value={this.settings}>
						<Timesheet
							initialState={timekeep}
							saveDetails={{
								app: this.app,
								fileName: i.sourcePath,
								getSectionInfo: () => i.getSectionInfo(e),
							}}
						/>
					</SettingsContext.Provider>
				);
			} else {
				root.render(
					<p className="timekeep-container">
						Failed to load timekeep: {loadResult.error}
					</p>
				);
			}
		});

		this.addCommand({
			id: `insert`,
			name: `Insert Timekeep`,
			editorCallback: (e) => {
				e.replaceSelection('```timekeep\n{"entries": []}\n```\n');
			},
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			defaultSettings,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
