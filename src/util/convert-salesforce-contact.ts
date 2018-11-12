import { Contact } from "@clinq/bridge";
import { PhoneNumberTypes } from ".";
import { PhoneNumber, PhoneNumberType, SalesforceContact } from "../models";

export const convertSalesforceContact = (apiUrl: string) => (contact: SalesforceContact): Contact => {
	const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(type => contact[type.property]);
	const phoneNumbers: PhoneNumber[] = relevantTypes.map(
		type => new PhoneNumber(type.label, contact[type.property])
	);
	return {
		id: contact.Id,
		email: contact.Email ? contact.Email : null,
		name: contact.Name,
		company: null,
		contactUrl: contact.attributes && contact.attributes.url ? `${apiUrl}${contact.attributes.url}` : null,
		avatarUrl: contact.PhotoUrl ? `${apiUrl}${contact.PhotoUrl}` : null,
		phoneNumbers
	};
};
