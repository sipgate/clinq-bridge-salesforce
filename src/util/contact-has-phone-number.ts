import { SalesforceContact } from "jsforce";
import { PhoneNumberTypes } from ".";

export function contactHasPhoneNumber(contact: SalesforceContact): boolean {
	return PhoneNumberTypes.some(type => contact[type.property]);
}
