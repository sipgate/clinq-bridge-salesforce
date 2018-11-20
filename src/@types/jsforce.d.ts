declare module "jsforce" {
	interface SalesforceAttributes {
		type: string | undefined;
		url: string | undefined;
	}

	export interface SalesforceContact {
		Id: string;
		Email: string | null;
		Name: string;
		Phone: string | null;
		MobilePhone: string | null;
		HomePhone: string | null;
		PhotoUrl: string | null;
		attributes: SalesforceAttributes | null;
	}

	export class OAuth2 {
		getAuthorizationUrl: (any) => string;
		constructor(params: OAuth2Options);
	}

	export interface OAuth2Options {
		clientId: string;
		clientSecret: string;
		redirectUri: string;
	}

	export interface ConnectionOptions {
		oauth2?: OAuth2;
		instanceUrl?: string;
		accessToken?: string;
		refreshToken?: string;
	}

	export interface QueryResult {
		records: SalesforceContact[];
		done: boolean;
		totalSize: number;
	}

	export class Connection {
		accessToken: string;
		refreshToken: string;
		instanceUrl: string;
		authorize: (code: string) => void;
		sobject: (resource: string) => any;
		query: (query: string) => QueryResult
		constructor(params: ConnectionOptions);
	}
}
