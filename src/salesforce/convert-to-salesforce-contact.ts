import { ContactTemplate, ContactUpdate, PhoneNumberLabel, PhoneNumber } from "@clinq/bridge";
import { SalesforceContact } from "jsforce";


function phoneNumberOrNull(phoneNumber: PhoneNumber): string | null {
	return phoneNumber ? phoneNumber.phoneNumber : null;
}

function defaultNumberOrNull(contact: ContactTemplate | ContactUpdate): string | null {
	return phoneNumberOrNull(
		contact.phoneNumbers.find(entry => entry.label === PhoneNumberLabel.WORK)
	);
}

function homeNumberOrNull(contact: ContactTemplate | ContactUpdate): string | null {
	return phoneNumberOrNull(
		contact.phoneNumbers.find(entry => entry.label === PhoneNumberLabel.HOME)
	);
}

function mobileNumberOrNull(contact: ContactTemplate | ContactUpdate): string | null {
	return phoneNumberOrNull(
		contact.phoneNumbers.find(entry => entry.label === PhoneNumberLabel.MOBILE)
	);
}

export function convertToSalesforceContact(
	contact: ContactTemplate | ContactUpdate
): SalesforceContact {
	return {
		FirstName: contact.firstName,
		LastName: contact.lastName,
		Email: contact.email,
		MobilePhone: mobileNumberOrNull(contact),
		HomePhone: homeNumberOrNull(contact),
		Phone: defaultNumberOrNull(contact)
	};
}



export function convertToSalesforceContactWithCustomHomePhone(
	contact: ContactTemplate | ContactUpdate
): SalesforceContact {
	const customContact = ({
		FirstName: contact.firstName,
		LastName: contact.lastName,
		Email: contact.email,
		MobilePhone: mobileNumberOrNull(contact),
		"HomePhone__c": homeNumberOrNull(contact),
		Phone: defaultNumberOrNull(contact)
	} as unknown) as SalesforceContact;

	return customContact;
}
