import { Config } from "@clinq/bridge";
import { Connection } from "jsforce";
import { promisify } from "util";
import { SalesforceContact } from "../models/salesforce-contact";
import { log } from "../util/logger";
import { RELEVANT_CONTACT_FIELDS } from "./auth";

export async function querySalesforceContacts(
	config: Config,
	connection: Connection,
	contacts: SalesforceContact[]
): Promise<SalesforceContact[]> {
	try {
		const lastContact = contacts[contacts.length - 1];
		const additionalCondition =
			contacts.length > 0 ? "CreatedDate > " + lastContact.CreatedDate : "";

		const sobjectContact = connection.sobject("Contact");

		const describeResult = await sobjectContact.describe();

		const fields = describeResult.fields
			.map(entry => entry.name)
			.filter(field => RELEVANT_CONTACT_FIELDS.includes(field));

		const result = await sobjectContact
			.select(fields.join(", "))
			.where(additionalCondition)
			.limit(2000)
			.orderby("CreatedDate", "ASC")
			.execute();

		const newContacts: SalesforceContact[] = result;

		const newContactsCount = newContacts.length;
		log(
			config,
			`Fetched chunk of ${newContactsCount} contacts...`
		);

		const mergedContacts = [...contacts, ...newContacts];

		if (newContactsCount > 0) {
			return querySalesforceContacts(config, connection, mergedContacts);
		} else {
			log(
				config,
				"Done fetching contacts."
			);
			return mergedContacts;
		}
	} catch (error) {
		log(config, "Could not fetch contacts", error);
		return contacts;
	}
}