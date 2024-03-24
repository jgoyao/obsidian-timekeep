import { moment } from "obsidian";
import { TIMEKEEP, TimeEntry, Timekeep } from "@/schema";
import { TimekeepSettings } from "@/settings";
import { isEmptyString } from "@/utils";
import { strHash } from "@/utils/text";

/**
 * Replaces the contents of a specific timekeep codeblock within
 * a file returning the modified contents to be saved
 */
export function replaceTimekeepCodeblock(
	timekeep: Timekeep,
	content: string,
	lineStart: number,
	lineEnd: number
): string {
	const timekeepJSON = JSON.stringify(timekeep);

	// The actual JSON is the line after the code block start
	const contentStart = lineStart + 1;
	const contentLength = lineEnd - contentStart;

	// Split the content into lines
	const lines = content.split("\n");
	// Splice the new JSON content in between the codeblock, removing the old codeblock lines
	lines.splice(contentStart, contentLength, timekeepJSON);

	return lines.join("\n");
}

type LoadResult =
	| { success: true; timekeep: Timekeep }
	| { success: false; error: string };

/**
 * Attempts to load a {@see Timekeep} from the provided
 * JSON string
 *
 * @param value The JSON string to load from
 */
export function load(value: string): LoadResult {
	// Empty string should create an empty timekeep
	if (isEmptyString(value)) {
		return { success: true, timekeep: { entries: [] } };
	}

	// Load the JSON value
	let parsedValue: unknown;
	try {
		parsedValue = JSON.parse(value);
	} catch (e) {
		console.error("Failed to parse timekeep JSON", e);
		return { success: false, error: "Failed to parse timekeep JSON" };
	}

	// Parse the data against the schema
	const timekeepResult = TIMEKEEP.safeParse(parsedValue);
	if (!timekeepResult.success) {
		return { success: false, error: timekeepResult.error.toString() };
	}

	const timekeep = timekeepResult.data;
	return { success: true, timekeep };
}

/**
 * Creates a new entry that has just started
 *
 * @param name The name for the entry
 * @returns The created entry
 */
export function createEntry(name: string): TimeEntry {
	const startTime = moment();
	return {
		name,
		startTime,
		endTime: null,
		subEntries: null,
	};
}

export function getUniqueEntryHash(entry: TimeEntry): number {
	if (entry.subEntries === null) {
		return strHash(
			`${entry.name}${entry.startTime.valueOf()}${entry.endTime?.valueOf()}`
		);
	} else {
		const subEntriesHash = entry.subEntries.reduce(
			(acc, subEntry) => acc + getUniqueEntryHash(subEntry),
			0
		);
		return strHash(`${entry.name}${subEntriesHash}`);
	}
}

/**
 * Removes a time entry from the provided list returning
 * the new list
 *
 * @param entries
 * @param target
 */
export function removeEntry(
	entries: TimeEntry[],
	target: TimeEntry
): TimeEntry[] {
	if (entries.contains(target)) {
		return entries.filter((entry) => entry !== target);
	} else {
		return entries.map((entry) =>
			entry.subEntries !== null ? removeSubEntry(entry, target) : entry
		);
	}
}

/**
 * Stops any entries in the provided list that are running
 * returning a list of the new non running entries
 *
 * @param entries
 */
export function stopRunningEntries(entries: TimeEntry[]): TimeEntry[] {
	return entries.map((entry) => {
		if (entry.subEntries) {
			return {
				name: entry.name,
				startTime: null,
				endTime: null,
				subEntries: stopRunningEntries(entry.subEntries),
			};
		} else {
			return {
				name: entry.name,
				startTime: entry.startTime,
				endTime: entry.endTime ?? moment(),
				subEntries: null,
			};
		}
	});
}

export function updateEntry(
	entries: TimeEntry[],
	previousEntry: TimeEntry,
	newEntry: TimeEntry
): TimeEntry[] {
	return entries.map((entry) => {
		if (entry === previousEntry) {
			return newEntry;
		} else if (entry.subEntries !== null) {
			return {
				...entry,
				subEntries: updateEntry(
					entry.subEntries,
					previousEntry,
					newEntry
				),
			};
		} else {
			return entry;
		}
	});
}

/**
 * Removes a sub entry from the provided parent, returning
 * the new parent entry
 *
 * @param parent The parent to alter
 * @param target The removal target
 */
export function removeSubEntry(
	parent: TimeEntry,
	target: TimeEntry
): TimeEntry {
	// Parent has no children
	if (parent.subEntries === null) return parent;
	// Filter out the target value
	const filtered = parent.subEntries
		.filter((entry) => entry !== target)
		// Remove any matching sub entries recursively
		.map((entry) =>
			entry.subEntries !== null ? removeSubEntry(entry, target) : entry
		);

	if (filtered.length > 1) {
		return {
			name: parent.name,
			subEntries: filtered,
			startTime: null,
			endTime: null,
		};
	}

	const item = filtered[0];

	// We can only collapse if the item is not a group
	if (item.subEntries === null) {
		return {
			name: parent.name,
			subEntries: null,
			startTime: item.startTime,
			endTime: item.endTime,
		};
	} else {
		return {
			name: parent.name,
			subEntries: item.subEntries,
			startTime: null,
			endTime: null,
		};
	}
}

/**
 * Starts a new sub entry within the provided entry
 * using the provided name
 *
 * @param parent The parent entry
 * @param name The name of the new entry
 */
export function withSubEntry(parent: TimeEntry, name: string): TimeEntry {
	// Parent already has children, append to existing
	if (parent.subEntries !== null) {
		// Assign a name automatically if not provided
		if (isEmptyString(name)) {
			name = `Part ${parent.subEntries.length + 1}`;
		}

		return {
			name: parent.name,
			subEntries: [...parent.subEntries, createEntry(name)],
			startTime: null,
			endTime: null,
		};
	}

	// Assign a name automatically if not provided
	if (isEmptyString(name)) {
		name = `Part 2`;
	}

	return {
		name: parent.name,
		// Move the parent into its first sub entry
		subEntries: [{ ...parent, name: "Part 1" }, createEntry(name)],
		startTime: null,
		endTime: null,
	};
}

/**
 * Determines whether the provided timekeep is running
 *
 * @param timekeep The timekeep to check
 * @returns Whether the timekeep is running
 */
export function isKeepRunning(timekeep: Timekeep): boolean {
	return getRunningEntry(timekeep.entries) !== null;
}

/**
 * Checks whether the provided entry is still running
 *
 * @param entry
 * @returns
 */
export function isEntryRunning(entry: TimeEntry) {
	if (entry.subEntries !== null) {
		return getRunningEntry(entry.subEntries) !== null;
	} else {
		return entry.endTime === null;
	}
}

/**
 * Searches recursively through the list of entires
 * searching for an entry that hasn't been stopped yet
 *
 * @param entries The entries to search
 * @return The found entry or null
 */
export function getRunningEntry(entries: TimeEntry[]): TimeEntry | null {
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		// Search sub entries if they are present
		if (entry.subEntries !== null) {
			const activeEntry = getRunningEntry(entry.subEntries);
			if (activeEntry !== null) {
				return activeEntry;
			}
		} else if (isEntryRunning(entry)) {
			return entry;
		}
	}

	return null;
}

/**
 *
 * @param entry
 * @returns
 */
export function getEntryDuration(entry: TimeEntry): number {
	if (entry.subEntries !== null) {
		return getTotalDuration(entry.subEntries);
	}

	// Get the end time or use current time if not ended
	const endTime = entry.endTime ?? moment();
	return endTime.diff(entry.startTime);
}

/**
 *
 * @param entries
 * @returns
 */
export function getTotalDuration(entries: TimeEntry[]): number {
	let duration = 0;
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		duration += getEntryDuration(entry);
	}
	return duration;
}

export function getEntriesOrdered(
	entries: TimeEntry[],
	settings: TimekeepSettings
): TimeEntry[] {
	return settings.reverseSegmentOrder ? entries.slice().reverse() : entries;
}
