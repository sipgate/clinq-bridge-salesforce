import { Adapter, Config, Contact, start, unauthorized } from "@clinq/bridge";
import { Request } from "express";
import { Connection, OAuth2, OAuth2Options } from "jsforce";

import { SalesforceContact } from "./models";
import { contactHasPhoneNumber, convertSalesforceContact, parseEnvironment } from "./util";

const oauth2Options: OAuth2Options = parseEnvironment();
const oauth2: OAuth2 = new OAuth2(oauth2Options);
const ANONYMIZED_KEY_CHARACTERS = 8;

class SalesforceAdapter implements Adapter {
	public async getContacts({ apiKey, apiUrl }: Config): Promise<Contact[]> {
		try {
			const [accessToken, refreshToken] = apiKey.split(":");
			const connection: Connection = new Connection({
				accessToken,
				instanceUrl: apiUrl,
				oauth2,
				refreshToken
			});
			const contacts: SalesforceContact[] = await connection.sobject("Contact").select("*");
			const anonymizedKey = `***${refreshToken.substr(
				refreshToken.length - ANONYMIZED_KEY_CHARACTERS,
				refreshToken.length
			)}`;
			console.log(
				`Found ${contacts.length} Salesforce contacts for API key ${anonymizedKey} on ${apiUrl}`
			);
			const parsedContacts: Contact[] = contacts
				.filter(contactHasPhoneNumber)
				.map(convertSalesforceContact(apiUrl));
			console.log(
				`Parsed ${parsedContacts.length} contacts for API key ${anonymizedKey} on ${apiUrl}`
			);
			return parsedContacts;
		} catch {
			unauthorized();
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
