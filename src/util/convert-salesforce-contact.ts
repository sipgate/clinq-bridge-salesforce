import { Contact } from "@clinq/bridge";
import { PhoneNumberTypes } from ".";
import { PhoneNumber, PhoneNumberType, SalesforceContact } from "../models";

export function convertSalesforceContact(contact: SalesforceContact): Contact {
	const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(type => contact[type.property]);
	const phoneNumbers: PhoneNumber[] = relevantTypes.map(
		type => new PhoneNumber(type.label, contact[type.property])
	);
	const parsedContact: Contact = {
		name: contact.Name,
		phoneNumbers
	};
	if (contact.Id) {
		parsedContact.id = contact.Id;
	}
	if (contact.Email) {
		parsedContact.email = contact.Email;
	}
	return parsedContact;
}
