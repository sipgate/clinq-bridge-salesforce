import { Contact, CrmAdapter, CrmConfig, start } from "clinq-crm-bridge";
import { Request } from "express";
import { Connection, OAuth2, OAuth2Options } from "jsforce";

import { PhoneNumber, PhoneNumberType, SalesforceContact } from "./models";
import {
	contactHasPhoneNumber,
	convertSalesforceContact,
	parseEnvironment,
	PhoneNumberTypes
} from "./util";

const oauth2Options: OAuth2Options = parseEnvironment();

const oauth2: OAuth2 = new OAuth2(oauth2Options);

class SalesforceAdapter implements CrmAdapter {
	public async getContacts(config: CrmConfig): Promise<Contact[]> {
		const conn: Connection = new Connection({
			accessToken: config.apiKey,
			instanceUrl: config.apiUrl
		});
		const contacts: SalesforceContact[] = await conn
			.sobject("Contact")
			.select("*");
		const parsedContacts: Contact[] = contacts
			.filter(contactHasPhoneNumber)
			.map(convertSalesforceContact);
		return parsedContacts;
	}

	public getOAuth2RedirectUrl(): Promise<string> {
		const redirectUrl: string = oauth2.getAuthorizationUrl({
			scope: "api refresh_token offline_access"
		});
		return Promise.resolve(redirectUrl);
	}

	public async handleOAuth2Callback(req: Request): Promise<CrmConfig> {
		const conn: Connection = new Connection({ oauth2 });
		const { code } = req.query;
		await conn.authorize(code);
		return {
			apiKey: `${conn.accessToken}:${conn.refreshToken}`,
			apiUrl: conn.instanceUrl
		};
	}
}

start(new SalesforceAdapter());
