import { Contact, PhoneNumber } from "@clinq/bridge";
import { PhoneNumberTypes } from "../util";
import { PhoneNumberType } from "../models";
import { SalesforceContact } from "../models/salesforce-contact";

export function convertFromSalesforceContact(
  contact: SalesforceContact
): Contact {
  const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(
    (type) => contact[type.property]
  );
  const phoneNumbers: PhoneNumber[] = relevantTypes.map((type) => ({
    label: type.label,
    phoneNumber: contact[type.property],
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
    phoneNumbers,
  };
}
