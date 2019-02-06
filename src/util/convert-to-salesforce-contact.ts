import { ContactTemplate, ContactUpdate, PhoneNumberLabel } from "@clinq/bridge";
import { SalesforceContact } from "jsforce";

export function convertToSalesforceContact(
	contact: ContactTemplate | ContactUpdate
): SalesforceContact {
	const mobilePhoneNumber = contact.phoneNumbers.find(
		entry => entry.label === PhoneNumberLabel.MOBILE
	);
	const homePhoneNumber = contact.phoneNumbers.find(entry => entry.label === PhoneNumberLabel.HOME);
	const defaultPhoneNumber = contact.phoneNumbers.find(
		entry => entry.label === PhoneNumberLabel.WORK
	);

	return {
		FirstName: contact.firstName,
		LastName: contact.lastName,
		Email: contact.email,
		MobilePhone: mobilePhoneNumber ? mobilePhoneNumber.phoneNumber : null,
		HomePhone: homePhoneNumber ? homePhoneNumber.phoneNumber : null,
		Phone: defaultPhoneNumber ? defaultPhoneNumber.phoneNumber : null
	};
}
