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
import { Connection, OAuth2, OAuth2Options, SalesforceContact } from "jsforce";
import { RedisCache } from "./cache";
import { contactHasPhoneNumber, convertFromSalesforceContact, parseEnvironment } from "./util";
import { anonymizeKey } from "./util/anonymize-key";
import { convertToSalesforceContact } from "./util/convert-to-salesforce-contact";

const { REDIS_URL } = process.env;

const oauth2Options: OAuth2Options = parseEnvironment();
const oauth2: OAuth2 = new OAuth2(oauth2Options);
const redisCache: RedisCache = new RedisCache(REDIS_URL);
const queryTimes = new Map<string, number>();
const QUERY_TIME_LIMIT = 60 * 60 * 1000;

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

		const result = await connection
			.sobject("Contact")
			.select("*")
			.where(additionalCondition)
			.limit(2000)
			.orderby("CreatedDate", "ASC")
			.execute((error, records) => {
				if (error || !records) {
					console.error("Got an error while fetching chunk:", error.message);
					return [];
				}
				return records.map(record => {
					return {
						Id: record.Id,
						Email: record.Email,
						Name: record.Name,
						FirstName: record.FirstName,
						LastName: record.LastName,
						Phone: record.Phone,
						MobilePhone: record.MobilePhone,
						HomePhone: record.HomePhone,
						CreatedDate: record.CreatedDate
					};
				});
			});

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

async function getContacts(apiKey: string, apiUrl: string): Promise<Contact[]> {
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
		return parsedContacts;
	} catch (error) {
		console.log(`Could not fetch contacts: ${error.message}`);
	}
}

async function populateCache({ apiKey, apiUrl }: Config): Promise<void> {
	try {
		const contacts: Contact[] = await getContacts(apiKey, apiUrl);
		queryTimes.set(apiKey, new Date().getTime());
		await redisCache.set(apiKey, contacts);
	} catch (error) {
		console.error(`Could not get contacts for key "${anonymizeKey(apiKey)}"`, error.message);
		throw new ServerError(401, "Unauthorized");
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

class SalesforceAdapter implements Adapter {
	public async getContacts(config: Config): Promise<Contact[]> {
		const cached = redisCache.get(config.apiKey);
		const lastQueryTime = queryTimes.get(config.apiKey);
		const now = new Date().getTime();
		if (cached && lastQueryTime && now - lastQueryTime < QUERY_TIME_LIMIT) {
			return cached;
		}
		populateCache(config);
		return cached || [];
	}

	public async createContact(config: Config, contact: ContactTemplate): Promise<Contact> {
		const salesforceContact = convertToSalesforceContact(contact);
		const anonymizedKey = anonymizeKey(config.apiKey);
		try {
			const connection = createSalesforceConnection(config);
			const response = await connection.sobject("Contact").create(salesforceContact);
			const createdContact = createContactResponse(response.id, contact);
			const cached = await redisCache.get(config.apiKey);

			if (cached) {
				const updatedCache = [...cached, createdContact];
				await redisCache.set(config.apiKey, updatedCache);
			}
			return createdContact;
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
			const updatedContact = createContactResponse(response.id, contact);
			const cached = await redisCache.get(config.apiKey);

			if (cached) {
				const updatedCache = cached.map(entry => (entry.id === id ? updatedContact : entry));
				await redisCache.set(config.apiKey, updatedCache);
			}
			return updatedContact;
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
			const cached = await redisCache.get(config.apiKey);

			if (cached) {
				const updatedCache = cached.filter(entry => entry.id !== id);
				await redisCache.set(config.apiKey, updatedCache);
			}
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
