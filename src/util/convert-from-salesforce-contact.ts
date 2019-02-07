import { Contact, PhoneNumber } from "@clinq/bridge";
import { SalesforceContact } from "jsforce";
import { PhoneNumberTypes } from ".";
import { PhoneNumberType } from "../models";

export function convertFromSalesforceContact(contact: SalesforceContact): Contact {
	const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(type => contact[type.property]);
	const phoneNumbers: PhoneNumber[] = relevantTypes.map(type => ({
		label: type.label,
		phoneNumber: contact[type.property]
	}));
	return {
		id: contact.Id,
		email: contact.Email ? contact.Email : null,
		name: contact.Name ? contact.Name : null,
		firstName: contact.FirstName ? contact.FirstName : null,
		lastName: contact.LastName ? contact.LastName : null,
		organization: null,
		contactUrl: null,
		avatarUrl: null,
		phoneNumbers
	};
}
