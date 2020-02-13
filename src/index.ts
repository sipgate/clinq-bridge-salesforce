import {
	Adapter,
	CallDirection,
	CallEvent,
	Config,
	Contact,
	ContactTemplate,
	ContactUpdate,
	ServerError,
	start as startBridge
} from "@clinq/bridge";
import { Request } from "express";
import { Connection, OAuth2, OAuth2Options, SalesforceContact } from "jsforce";
import { promisify } from "util";
import {
	anonymizeKey,
	convertFromSalesforceContact,
	formatDuration,
	parseEnvironment,
	parsePhoneNumber
} from "./util";
import { convertToSalesforceContact } from "./util/convert-to-salesforce-contact";

const oauth2Options: OAuth2Options = parseEnvironment();
const oauth2: OAuth2 = new OAuth2(oauth2Options);
const RELEVANT_CONTACT_FIELDS = [
	"Id",
	"Email",
	"Name",
	"FirstName",
	"LastName",
	"Phone",
	"MobilePhone",
	"HomePhone",
	"CreatedDate"
];

function createSalesforceConnection({ apiKey, apiUrl }: Config): Connection {
	const [accessToken, refreshToken] = apiKey.split(":");
	return new Connection({
		accessToken,
		instanceUrl: apiUrl,
		oauth2,
		refreshToken
	});
}

async function querySalesforceContacts(
	connection: Connection,
	contacts: SalesforceContact[]
): Promise<SalesforceContact[]> {
	try {
		const lastContact = contacts[contacts.length - 1];
		const additionalCondition =
			contacts.length > 0 ? "CreatedDate > " + lastContact.CreatedDate : "";

		const sobjectContact = connection.sobject("Contact");

		const describeResult = await promisify(sobjectContact.describe)();
		const fields = describeResult.fields
			.map(entry => entry.name)
			.filter(field => RELEVANT_CONTACT_FIELDS.includes(field));

		const result = await sobjectContact
			.select(fields.join(", "))
			.where(additionalCondition)
			.limit(2000)
			.orderby("CreatedDate", "ASC")
			.execute<SalesforceContact>(handleExecute);

		const newContacts: SalesforceContact[] = result;

		const newContactsCount = newContacts.length;
		console.log(`Fetched chunk of ${newContactsCount} contacts...`);

		const mergedContacts = [...contacts, ...newContacts];

		if (newContactsCount > 0) {
			return querySalesforceContacts(connection, mergedContacts);
		} else {
			console.log("Done fetching contacts.");
			return mergedContacts;
		}
	} catch (error) {
		console.log(`Could not fetch contacts: ${error.message}`);
		return contacts;
	}
}

function createContactResponse(id: string, contact: ContactTemplate | ContactUpdate): Contact {
	return {
		id,
		name: null,
		firstName: contact.firstName ? contact.firstName : null,
		lastName: contact.lastName ? contact.lastName : null,
		email: contact.email ? contact.email : null,
		organization: null,
		contactUrl: null,
		avatarUrl: null,
		phoneNumbers: Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : []
	};
}

async function getContactByPhoneOrMobilePhone(
	connection: Connection,
	localized: string,
	e164: string
): Promise<SalesforceContact | null> {
	try {
		const result = await connection
			.sobject("Contact")
			.find({
				$or: {
					MobilePhone: { $in: [localized, e164] },
					Phone: { $in: [localized, e164] }
				}
			})
			.execute<SalesforceContact>(handleExecute);
		console.log(
			`Getting contact by phone or mobile phone with numbers ${localized} or ${e164} returned ${result.length} results.`
		);
		const contact = result.find(Boolean);
		return contact;
	} catch (e) {
		console.warn("Unable to find contact by HomePhone", e);
		return null;
	}
}

async function getContactByHomePhone(
	connection: Connection,
	localized: string,
	e164: string
): Promise<SalesforceContact | null> {
	try {
		const result = await connection
			.sobject("Contact")
			.find({
				HomePhone: { $in: [localized, e164] }
			})
			.execute<SalesforceContact>(handleExecute);
		console.log(
			`Getting contact by home phone with numbers ${localized} or ${e164} returned ${result.length} results.`
		);
		const contact = result.find(Boolean);
		return contact;
	} catch (e) {
		console.warn("Unable to find contact by HomePhone", e);
		return null;
	}
}

function handleExecute(error: Error, records: SalesforceContact[]): SalesforceContact[] {
	if (error || !records) {
		console.error("Error while executing query:", error);
		return [];
	}
	return records;
}

class SalesforceAdapter implements Adapter {
	public async getContacts(config: Config): Promise<Contact[]> {
		try {
			const connection = createSalesforceConnection(config);
			const contacts: SalesforceContact[] = await querySalesforceContacts(connection, []);
			const anonymizedKey = anonymizeKey(config.apiKey);
			console.log(
				`Found ${contacts.length} Salesforce contacts for API key ${anonymizedKey} on ${config.apiUrl}`
			);
			const parsedContacts: Contact[] = contacts.map(convertFromSalesforceContact);
			console.log(
				`Parsed ${parsedContacts.length} contacts for API key ${anonymizedKey} on ${config.apiUrl}`
			);
			return parsedContacts;
		} catch (error) {
			console.log(`Could not fetch contacts: ${error.message}`);
			return [];
		}
	}

	public async createContact(config: Config, contact: ContactTemplate): Promise<Contact> {
		const salesforceContact = convertToSalesforceContact(contact);
		const anonymizedKey = anonymizeKey(config.apiKey);
		try {
			const connection = createSalesforceConnection(config);
			const response = await connection.sobject("Contact").create(salesforceContact);
			return createContactResponse(response.id, contact);
		} catch (error) {
			console.log(`Could not create contact for ${anonymizedKey}`, error.message);
			if (error.name === "DUPLICATES_DETECTED") {
				throw new ServerError(403, "Contact already exists.");
			}
		}
	}

	public async updateContact(config: Config, id: string, contact: ContactUpdate): Promise<Contact> {
		const salesforceContact = convertToSalesforceContact(contact);
		const anonymizedKey = anonymizeKey(config.apiKey);
		try {
			const connection = createSalesforceConnection(config);
			const response = await connection.sobject("Contact").update({ Id: id, ...salesforceContact });
			return createContactResponse(response.id, contact);
		} catch (error) {
			console.log(`Could not update contact for ${anonymizedKey}`, error.message);
			if (error.name === "ENTITY_IS_DELETED" || error.name === "INVALID_CROSS_REFERENCE_KEY") {
				throw new ServerError(404, "Contact not found.");
			}
		}
	}

	public async deleteContact(config: Config, id: string): Promise<void> {
		const anonymizedKey = anonymizeKey(config.apiKey);
		try {
			const connection = createSalesforceConnection(config);
			await connection.sobject("Contact").destroy(id);
		} catch (error) {
			console.log(`Could not delete contact for ${anonymizedKey}`, error.message);
			if (error.name === "ENTITY_IS_DELETED" || error.name === "INVALID_CROSS_REFERENCE_KEY") {
				throw new ServerError(404, "Contact not found.");
			}
		}
	}

	public getOAuth2RedirectUrl(): Promise<string> {
		const redirectUrl: string = oauth2.getAuthorizationUrl({
			scope: "api refresh_token offline_access"
		});
		return Promise.resolve(redirectUrl);
	}

	public async handleOAuth2Callback(req: Request): Promise<{ apiKey: string; apiUrl: string }> {
		const connection: Connection = new Connection({ oauth2 });
		const { code } = req.query;
		await connection.authorize(code);
		return {
			apiKey: `${connection.accessToken}:${connection.refreshToken}`,
			apiUrl: connection.instanceUrl
		};
	}

	public async handleCallEvent(
		config: Config,
		{ direction, from, to, channel, start, end }: CallEvent
	): Promise<void> {
		try {
			const connection = createSalesforceConnection(config);
			const phoneNumber = direction === CallDirection.IN ? from : to;
			const { e164, localized } = parsePhoneNumber(phoneNumber);
			const anonymizedKey = anonymizeKey(config.apiKey);
			const phoneContact = await getContactByPhoneOrMobilePhone(connection, localized, e164);
			const homePhoneContact = await getContactByHomePhone(connection, localized, e164);

			const contact = phoneContact || homePhoneContact;

			if (!contact) {
				console.log(
					`Unable to find a contact for ${anonymizedKey} with phoneNumber ${phoneNumber}`
				);
				return;
			}

			const directionInfo = direction === CallDirection.IN ? "Incoming" : "Outgoing";
			const date = new Date(start);
			const duration = formatDuration(end - start);

			const task = {
				WhoId: contact.Id,
				CallDisposition: channel.name,
				ActivityDate: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
				Status: "Completed",
				TaskSubType: "Call",
				Subject: `${directionInfo} CLINQ call in "${channel.name}" (${duration})`
			};
			await connection.sobject("Task").create(task);
			console.log(
				`Successfully added call event for ${anonymizedKey} with phoneNumber ${phoneNumber}`
			);
		} catch (error) {
			console.error("Could not save CallEvent", error.message);
			throw new ServerError(400, "Could not save CallEvent");
		}
	}
}

startBridge(new SalesforceAdapter());
