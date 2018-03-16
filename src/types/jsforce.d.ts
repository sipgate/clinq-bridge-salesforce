declare module "jsforce" {
	class OAuth2 {
		getAuthorizationUrl: (any) => string;
		constructor(params: OAuth2Options);
	}

	interface OAuth2Options {
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}

	interface ConnectionOptions {
		oauth2: OAuth2;
	}

	class Connection {
		accessToken: string;
		authorize: (code: string) => void;
		sobject: (resource: string) => any;
		constructor(params: ConnectionOptions);
	}
}
