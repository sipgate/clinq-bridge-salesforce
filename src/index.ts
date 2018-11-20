import { Adapter, Config, Contact, start, unauthorized } from "@clinq/bridge";
import { Request } from "express";
import { Connection, OAuth2, OAuth2Options, SalesforceContact } from "jsforce";
import { contactHasPhoneNumber, convertSalesforceContact, parseEnvironment } from "./util";

const oauth2Options: OAuth2Options = parseEnvironment();
const oauth2: OAuth2 = new OAuth2(oauth2Options);
const ANONYMIZED_KEY_CHARACTERS = 8;

const cache = new Map<string, Contact[]>();

const querySalesforceContacts = async (
	connection: Connection,
	contacts: SalesforceContact[]
): Promise<SalesforceContact[]> => {
	try {
		const result = await connection.query(`
			SELECT
				Contact.Id,
				Contact.Email,
				Contact.Name,
				Contact.Phone,
				Contact.MobilePhone,
				Contact.HomePhone
			FROM Contact
			WHERE Contact.Phone != null
				OR Contact.MobilePhone != null
				OR Contact.HomePhone != null
			OFFSET ${contacts.length}
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
};

const getContacts = async ({ apiKey, apiUrl }: Config) => {
	const [accessToken, refreshToken] = apiKey.split(":");
	const connection: Connection = new Connection({
		accessToken,
		instanceUrl: apiUrl,
		oauth2,
		refreshToken
	});
	const contacts: SalesforceContact[] = await querySalesforceContacts(connection, []);
	const anonymizedKey = `***${refreshToken.substr(
		refreshToken.length - ANONYMIZED_KEY_CHARACTERS,
		refreshToken.length
	)}`;
	console.log(
		`Found ${contacts.length} Salesforce contacts for API key ${anonymizedKey} on ${apiUrl}`
	);
	const parsedContacts: Contact[] = contacts
		.filter(contactHasPhoneNumber)
		.map(convertSalesforceContact);
	console.log(`Parsed ${parsedContacts.length} contacts for API key ${anonymizedKey} on ${apiUrl}`);
	cache.set(apiKey, parsedContacts);
};

class SalesforceAdapter implements Adapter {
	public async getContacts(config: Config): Promise<Contact[]> {
		getContacts(config);
		return cache.get(config.apiKey) || [];
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
