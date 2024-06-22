import React from "react";
import { Timekeep } from "@/schema";
import type { Moment } from "moment";
import { getTotalDuration } from "@/timekeep";
import { Page, View, Text, Document, StyleSheet } from "@/pdf";
import { formatDate, formatDuration, formatDurationHoursTrunc } from "@/utils";

import TimesheetPdfTable from "./TimesheetPdfTable";

type Props = {
	title: string;
	data: Timekeep;
	currentTime: Moment;
	footnote: string;
};

const styles = StyleSheet.create({
	// Styles for a page
	page: {
		fontFamily: "Roboto",
		padding: 15,
	},

	// Heading with the page title and timesheet title
	heading: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 5,
	},

	// User specified title and "Timesheet"
	title: {
		fontFamily: "Roboto",
		fontWeight: 700,
		fontSize: 12,
		marginBottom: 5,
	},

	// Detail items at the top (Date, Total Duration, Short Duration)
	details: {
		gap: 4,
		marginBottom: 5,
	},

	// Name of a details field
	detailsFieldName: {
		fontFamily: "Roboto",
		fontWeight: 700,
		fontSize: 8,
		marginBottom: 5,
	},

	// Value of a details field
	detailsFieldValue: {
		fontSize: 8,
		marginBottom: 5,
	},

	// Footer note
	footNote: {
		marginTop: 10,
		fontSize: 6,
		fontFamily: "Roboto",
		fontWeight: 700,
	},
});

export default function TimesheetPdf({
	title,
	data,
	currentTime,
	footnote,
}: Props) {
	// Get the total elapsed duration
	const duration = getTotalDuration(data.entries, currentTime);

	const currentDate = formatDate(currentTime);
	const totalDuration = formatDuration(duration);
	const totalDurationShort = formatDurationHoursTrunc(duration);

	// Individual field within the details section
	const DetailField = ({ name, value }: { name: string; value: string }) => (
		<Text style={styles.detailsFieldValue}>
			<Text style={styles.detailsFieldName}>{name}: </Text>
			{value}
		</Text>
	);

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.heading}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.title}>Timesheet</Text>
				</View>

				<View style={styles.details}>
					<DetailField name="Date" value={currentDate} />
					<DetailField name="Total Duration" value={totalDuration} />
					<DetailField
						name="Total Duration (hours)"
						value={totalDurationShort}
					/>
				</View>

				<TimesheetPdfTable
					data={data}
					currentTime={currentTime}
					totalDuration={totalDuration}
				/>

				<Text style={styles.footNote} wrap={false}>
					{footnote}
				</Text>
			</Page>
		</Document>
	);
}
