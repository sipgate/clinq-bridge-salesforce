import { Contact } from "clinq-crm-bridge";
import * as express from "express";
import { Request, Response } from "express";
import { Connection, OAuth2 } from "jsforce";

const PORT = 8081;

const {
	SF_OAUTH_PROVIDER_CLIENT_ID: clientId,
	SF_OAUTH_PROVIDER_CLIENT_SECRET: clientSecret,
	SF_OAUTH_PROVIDER_REDIRECT_URI: redirectUri
} = process.env;

interface PhoneNumberType {
	property: string;
	label: string;
}

interface PhoneNumber {
	label: string;
	phoneNumber: string;
}

const PhoneNumberTypes: PhoneNumberType[] = [
	{
		property: "Phone",
		label: "Work"
	},
	{
		property: "MobilePhone",
		label: "Mobile"
	},
	{
		property: "HomePhone",
		label: "Home"
	}
];

const contactHasPhoneNumber = contact =>
	PhoneNumberTypes.some(type => contact[type.property]);

function convertToCrmContact(contact: any): Contact {
	const phoneNumbers = PhoneNumberTypes.filter(
		type => contact[type.property]
	).map(
		type =>
			<PhoneNumber>{
				label: type.label,
				phoneNumber: contact[type.property]
			}
	)
	return {
		name: contact.Name,
		phoneNumbers
	};
}

const redirectToAuthUrl = oauth2 => (req: Request, res: Response) => {
	res.redirect(oauth2.getAuthorizationUrl({ scope: "api" }));
}

const handleAuthCallback = oauth2 => async (req: Request, res: Response) => {
	try {
		const conn = new Connection({ oauth2 });
		const { code } = req.query;
		await conn.authorize(code);
		// console.log(conn.accessToken);
		const contacts = await conn.sobject("Contact").select("*");
		const parsedContacts: Contact[] = contacts
			.filter(contactHasPhoneNumber)
			.map(convertToCrmContact);
		res.send(parsedContacts);
	} catch (error) {
		console.log("Could not get access token", error.message);
		res.send("failure");
	}
}

export const startOAuthProvider = () => {
	if (!clientId || !clientSecret || !redirectUri) {
		return;
	}

	const oauth2 = new OAuth2({
		clientId,
		redirectUri,
		clientSecret
	});

	const app: express.Application = express();

	app.get("/oauth2/auth", redirectToAuthUrl(oauth2));

	app.get("/oauth2/callback", handleAuthCallback(oauth2));

	app.listen(PORT, () => {
		console.log("OAuth provider listening on port", PORT);
	});
};
