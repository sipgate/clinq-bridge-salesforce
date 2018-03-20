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
		const [accessToken, refreshToken] = config.apiKey.split(":");
		const connection: Connection = new Connection({
			accessToken,
			instanceUrl: config.apiUrl,
			oauth2,
			refreshToken
		});
		const contacts: SalesforceContact[] = await connection.sobject("Contact").select("*");
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
