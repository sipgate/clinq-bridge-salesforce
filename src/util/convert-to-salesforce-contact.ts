import { ContactTemplate, ContactUpdate } from "@clinq/bridge";
import { SalesforceContact } from "jsforce";

export function convertToSalesforceContact(contact: ContactTemplate | ContactUpdate): SalesforceContact {
	const mobilePhoneNumber = contact.phoneNumbers.find(entry => entry.label === "Mobile");
	const homePhoneNumber = contact.phoneNumbers.find(entry => entry.label === "Home");
	const defaultPhoneNumber = contact.phoneNumbers.find(entry => entry.label === "Default");

	return {
		FirstName: contact.firstName,
		LastName: contact.lastName,
		Email: contact.email,
		MobilePhone: mobilePhoneNumber ? mobilePhoneNumber.phoneNumber : null,
		HomePhone: homePhoneNumber ? homePhoneNumber.phoneNumber : null,
		Phone: defaultPhoneNumber ? defaultPhoneNumber.phoneNumber : null
	};
}
