import { PhoneNumberTypes } from ".";
import { SalesforceContact } from "../models";

export function contactHasPhoneNumber(contact: SalesforceContact): boolean {
	return PhoneNumberTypes.some(type => contact[type.property]);
}
