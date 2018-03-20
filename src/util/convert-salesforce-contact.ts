import { Contact } from "clinq-crm-bridge";
import { PhoneNumberTypes } from ".";
import { PhoneNumber, PhoneNumberType, SalesforceContact } from "../models";

export function convertSalesforceContact(contact: SalesforceContact): Contact {
	const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(type => contact[type.property]);
	const phoneNumbers: PhoneNumber[] = relevantTypes.map(
		type => new PhoneNumber(type.label, contact[type.property])
	);
	return {
		name: contact.Name,
		phoneNumbers
	};
}
