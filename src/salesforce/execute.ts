import { SalesforceContact } from "../models/salesforce-contact";
import {Record} from "jsforce";

export function handleExecute(error: Error, records: Record<SalesforceContact>[]): SalesforceContact[] {
	if (error || !records) {
		console.error("Error while executing query:", error);
		return [];
	}
	return records;
}