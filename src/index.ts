import {
	Adapter,
	Config,
	Contact,
	ContactTemplate,
	ContactUpdate,
	ServerError,
	start
} from "@clinq/bridge";
import { Request } from "express";
import { Connection, CRUDError, OAuth2, OAuth2Options, SalesforceContact } from "jsforce";
import { contactHasPhoneNumber, convertFromSalesforceContact, parseEnvironment } from "./util";
import { convertToSalesforceContact } from "./util/convert-to-salesforce-contact";

const oauth2Options: OAuth2Options = parseEnvironment();
const oauth2: OAuth2 = new OAuth2(oauth2Options);
const ANONYMIZED_KEY_CHARACTERS = 8;

const cache = new Map<string, Contact[]>();

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
			contacts.length > 0 ? "AND Contact.CreatedDate > " + lastContact.CreatedDate : "";

		const result = await connection.query(`
			SELECT
				Contact.Id,
				Contact.Email,
				Contact.Name,
				Contact.Phone,
				Contact.MobilePhone,
				Contact.HomePhone,
				Contact.CreatedDate
			FROM Contact
			WHERE (
				Contact.Phone != null
					OR Contact.MobilePhone != null
					OR Contact.HomePhone != null
			)
			${additionalCondition}
			ORDER BY Contact.CreatedDate
			LIMIT 2000
		`);

		const newContacts: SalesforceContact[] = result.records;

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

function anonymizeKey(apiKey: string): string {
	const [, refreshToken] = apiKey.split(":");
	return `***${refreshToken.substr(
		refreshToken.length - ANONYMIZED_KEY_CHARACTERS,
		refreshToken.length
	)}`;
}

async function getContacts({ apiKey, apiUrl }: Config): Promise<void> {
	try {
		const connection = createSalesforceConnection({ apiKey, apiUrl });
		const contacts: SalesforceContact[] = await querySalesforceContacts(connection, []);
		const anonymizedKey = anonymizeKey(apiKey);
		console.log(
			`Found ${contacts.length} Salesforce contacts for API key ${anonymizedKey} on ${apiUrl}`
		);
		const parsedContacts: Contact[] = contacts
			.filter(contactHasPhoneNumber)
			.map(convertFromSalesforceContact);
		console.log(
			`Parsed ${parsedContacts.length} contacts for API key ${anonymizedKey} on ${apiUrl}`
		);
		cache.set(apiKey, parsedContacts);
	} catch (error) {
		console.log(`Could not fetch contacts: ${error.message}`);
	}
}

function createContactResponse(id: string, contact: ContactTemplate | ContactUpdate): Contact {
	return {
		id,
		name: null,
		firstName: contact.firstName ? contact.firstName : null,
		lastName: contact.lastName ? contact.lastName : null,
		email: contact.email ? contact.email : null,
		company: null,
		contactUrl: null,
		avatarUrl: null,
		phoneNumbers: Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : []
	};
}

class SalesforceAdapter implements Adapter {
	public async getContacts(config: Config): Promise<Contact[]> {
		getContacts(config);
		return cache.get(config.apiKey) || [];
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

	public async handleOAuth2Callback(req: Request): Promise<Config> {
		const connection: Connection = new Connection({ oauth2 });
		const { code } = req.query;
		await connection.authorize(code);
		return {
			apiKey: `${connection.accessToken}:${connection.refreshToken}`,
			apiUrl: connection.instanceUrl
		};
	}
}

start(new SalesforceAdapter());
