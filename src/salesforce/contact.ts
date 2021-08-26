import {
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  ServerError,
} from "@clinq/bridge";
import { Connection, SuccessResult } from "jsforce";
import { SalesforceContact } from "../models/salesforce-contact";
import {
  convertToSalesforceContactWithCustomHomePhone,
  convertToSalesforceContactWithoutHomePhone,
  parsePhoneNumber,
} from "../util";
import { log } from "../util/logger";
import { createSalesforceConnection } from "./connection";

export async function getContactByPhoneOrMobilePhone(
  config: Config,
  connection: Connection,
  phoneNumber: string
): Promise<SalesforceContact | null> {
  try {
    const numbers = getFormattedNumbers(phoneNumber);
    const result = await connection
      .sobject("Contact")
      .find<SalesforceContact>({
        $or: {
          MobilePhone: { $in: numbers },
          Phone: { $in: numbers },
        },
      })
      .execute();

    log(
      config,
      `Getting contact by Phone or MobilePhone returned ${result.length} results.`,
      numbers
    );
    const contact = result.find(Boolean);
    return contact;
  } catch (error) {
    log(config, "Unable to find contact by Phone or MobilePhone", error);
    return null;
  }
}

export function getFormattedNumbers(phoneNumber: string): string[] {
  const { e164, localized } = parsePhoneNumber(phoneNumber);
  return [localized, e164, `+${e164}`];
}

export async function getContactByHomePhone(
  config: Config,
  connection: Connection,
  phoneNumber: string
): Promise<SalesforceContact | null> {
  try {
    const numbers = getFormattedNumbers(phoneNumber);
    const result = await connection
      .sobject("Contact")
      .find<SalesforceContact>({
        HomePhone: { $in: numbers },
      })
      .execute();
    log(
      config,
      `Getting contact by home HomePhone ${result.length} results.`,
      numbers
    );
    const contact = result.find(Boolean);
    return contact;
  } catch (error) {
    if (error.name === "INVALID_FIELD") {
      log(config, "Contact does not nave HomePhone set as default field");
    } else {
      log(config, "Unable to find contact by HomePhone", error);
    }

    return null;
  }
}

export async function getContactByCustomHomePhone(
  config: Config,
  connection: Connection,
  phoneNumber: string
): Promise<SalesforceContact | null> {
  try {
    const numbers = getFormattedNumbers(phoneNumber);
    const result = await connection
      .sobject("Contact")
      .find<SalesforceContact>({
        HomePhone__c: { $in: numbers },
      })
      .execute();
    log(
      config,
      `Getting contact by HomePhone__c returned ${result.length} results.`,
      numbers
    );
    const contact = result.find(Boolean);
    return contact;
  } catch (error) {
    log(config, "Unable to find contact by HomePhone__c", error);
    return null;
  }
}

export function createContactResponse(
  id: string,
  contact: ContactTemplate | ContactUpdate
): Contact {
  return {
    id,
    name: null,
    firstName: contact.firstName ? contact.firstName : null,
    lastName: contact.lastName ? contact.lastName : null,
    email: contact.email ? contact.email : null,
    organization: null,
    contactUrl: null,
    avatarUrl: null,
    phoneNumbers: Array.isArray(contact.phoneNumbers)
      ? contact.phoneNumbers
      : [],
  };
}

export async function updateContact(
  config: Config,
  id: string,
  salesforceContact: SalesforceContact,
  contact: ContactUpdate
): Promise<Contact> {
  const connection = createSalesforceConnection(config);
  const response = await connection
    .sobject("Contact")
    .update({ Id: id, ...salesforceContact });

  // Cast response to SuccessResult for typescript
  const successResponse = response as SuccessResult;

  const contactResponse = createContactResponse(successResponse.id, contact);
  return contactResponse;
}

export async function createHomePhoneCustomField(
  config: Config
): Promise<void> {
  const connection = createSalesforceConnection(config);

  const metadata = [
    {
      fullName: "Contact.HomePhone__c",
      label: "CLINQ HomePhone",
      length: 80,
      type: "Text",
      inlineHelpText: "Text that appears in the ? next to a field.",
      defaultValue: "",
    },
  ];

  const metdataResult = await connection.metadata.create(
    "CustomField",
    metadata
  );

  log(config, "Created HomePhone metadata", metdataResult);
}

export async function tryUpdateContactWithCustomHomePhone(
  config: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> {
  try {
    // await createHomePhoneCustomField(config);
    log(config, "Updating contact without custom HomePhone");
    const salesforceContact =
      convertToSalesforceContactWithCustomHomePhone(contact);
    const contactResponse = await updateContact(
      config,
      id,
      salesforceContact,
      contact
    );
    console.log(contactResponse);
    return contactResponse;
  } catch (error) {
    log(config, "Could not update contact with custom HomePhone", error);
    return null;
  }
}

export async function tryUpdateContactWithoutHomePhone(
  config: Config,
  id: string,
  contact: ContactUpdate
): Promise<Contact> {
  try {
    const salesforceContact =
      convertToSalesforceContactWithoutHomePhone(contact);
    log(config, "Updating contact without HomePhone");
    const contactResponse = await updateContact(
      config,
      id,
      salesforceContact,
      contact
    );
    return contactResponse;
  } catch (error) {
    log(config, "Could not update contact without HomePhone", error);
    return null;
  }
}
