import { OAuth2Options } from "../models/oauth2";

const {
	SF_OAUTH_PROVIDER_CLIENT_ID: clientId,
	SF_OAUTH_PROVIDER_CLIENT_SECRET: clientSecret,
	SF_OAUTH_PROVIDER_REDIRECT_URI: redirectUri
} = process.env;

export function parseEnvironment(): OAuth2Options {
	if (!clientId) {
		throw new Error("Missing SF_OAUTH_PROVIDER_CLIENT_ID in environment.");
	}

	if (!clientSecret) {
		throw new Error("Missing SF_OAUTH_PROVIDER_CLIENT_SECRET in environment.");
	}

	if (!redirectUri) {
		throw new Error("Missing SF_OAUTH_PROVIDER_REDIRECT_URI in environment.");
	}

	return {
		clientId,
		clientSecret,
		redirectUri
	};
}
