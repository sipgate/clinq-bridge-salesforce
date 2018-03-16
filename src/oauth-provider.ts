import { Contact } from "clinq-crm-bridge";
import express = require("express");
import { Request, RequestHandler, Response } from "express";
import { Connection, OAuth2 } from "jsforce";

import { PhoneNumber, PhoneNumberType, SalesforceContact } from "./models";

const PORT: number = 8081;

const {
	SF_OAUTH_PROVIDER_CLIENT_ID: clientId,
	SF_OAUTH_PROVIDER_CLIENT_SECRET: clientSecret,
	SF_OAUTH_PROVIDER_REDIRECT_URI: redirectUri
} = process.env;

const PhoneNumberTypes: PhoneNumberType[] = [
	{
		label: "Work",
		property: "Phone"
	},
	{
		label: "Mobile",
		property: "MobilePhone"
	},
	{
		label: "Home",
		property: "HomePhone"
	}
];

const contactHasPhoneNumber: (
	contact: SalesforceContact
) => boolean = contact => PhoneNumberTypes.some(type => contact[type.property]);

function convertToCrmContact(contact: SalesforceContact): Contact {
	const relevantTypes: PhoneNumberType[] = PhoneNumberTypes.filter(
		type => contact[type.property]
	);
	const phoneNumbers: PhoneNumber[] = relevantTypes.map(
		type => new PhoneNumber(type.label, contact[type.property])
	);
	return {
		name: contact.Name,
		phoneNumbers
	};
}

const redirectToAuthUrl: (oauth2: OAuth2) => RequestHandler = oauth2 => (
	req: Request,
	res: Response
) => {
	const redirectUrl: string = oauth2.getAuthorizationUrl({ scope: "api" });
	res.redirect(redirectUrl);
};

const handleAuthCallback: (oauth2: OAuth2) => RequestHandler = oauth2 => async (
	req: Request,
	res: Response
) => {
	try {
		const conn: Connection = new Connection({ oauth2 });
		const { code } = req.query;
		await conn.authorize(code);
		// TODO: Redirect to administration page with conn.accessToken
		const contacts: SalesforceContact[] = await conn
			.sobject("Contact")
			.select("*");
		const parsedContacts: Contact[] = contacts
			.filter(contactHasPhoneNumber)
			.map(convertToCrmContact);
		res.send(parsedContacts);
	} catch (error) {
		res.send("failure");
	}
};

export const startOAuthProvider: () => void = () => {
	if (!clientId || !clientSecret || !redirectUri) {
		return;
	}

	const oauth2: OAuth2 = new OAuth2({
		clientId,
		clientSecret,
		redirectUri
	});

	const app: express.Application = express();

	app.get("/oauth2/auth", redirectToAuthUrl(oauth2));

	app.get("/oauth2/callback", handleAuthCallback(oauth2));

	app.listen(PORT, () => console.log("OAuth provider listening on port", PORT)); // tslint:disable-line
};
