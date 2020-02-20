import { SalesforceContact } from "../models/salesforce-contact";

export function handleExecute(error: Error, records: SalesforceContact[]): SalesforceContact[] {
	if (error || !records) {
		console.error("Error while executing query:", error);
		return [];
	}
	return records;
}