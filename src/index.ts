import { Contact, CrmAdapter, CrmConfig, start } from "clinq-crm-bridge";
import { Request } from "express";
import { Connection, OAuth2 } from "jsforce";

import { PhoneNumber, PhoneNumberType, SalesforceContact } from "./models";
import { contactHasPhoneNumber, convertSalesforceContact, PhoneNumberTypes } from "./util";

const {
	SF_OAUTH_PROVIDER_CLIENT_ID: clientId,
	SF_OAUTH_PROVIDER_CLIENT_SECRET: clientSecret,
	SF_OAUTH_PROVIDER_REDIRECT_URI: redirectUri
} = process.env;

const oauth2: OAuth2 = new OAuth2({
	clientId,
	clientSecret,
	redirectUri
});

class SalesforceAdapter implements CrmAdapter {
	public async getContacts(config: CrmConfig): Promise<Contact[]> {
		const conn: Connection = new Connection({ oauth2 });
		const contacts: SalesforceContact[] = await conn
			.sobject("Contact")
			.select("*");
		const parsedContacts: Contact[] = contacts
			.filter(contactHasPhoneNumber)
			.map(convertSalesforceContact);
		return parsedContacts;
	}

	public getOAuth2RedirectUrl(): Promise<string> {
		const redirectUrl: string = oauth2.getAuthorizationUrl({ scope: "api" });
		return Promise.resolve(redirectUrl);
	}

	public async handleOAuth2Callback(req: Request): Promise<string> {
		const conn: Connection = new Connection({ oauth2 });
		const { code } = req.query;
		await conn.authorize(code);
		return conn.accessToken;
	}
}

start(new SalesforceAdapter());
