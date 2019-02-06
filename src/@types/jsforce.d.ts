declare module "jsforce" {
	interface SalesforceAttributes {
		type: string | undefined;
		url: string | undefined;
	}

	interface SalesforceContact {
		Id?: string;
		Email: string | null;
		FirstName: string;
		LastName: string;
		Phone?: string | null;
		MobilePhone?: string | null;
		HomePhone?: string | null;
		CreatedDate?: string;
		attributes?: SalesforceAttributes | null;
	}

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
		oauth2?: OAuth2;
		instanceUrl?: string;
		accessToken?: string;
		refreshToken?: string;
	}

	interface QueryResult {
		records: SalesforceContact[];
		done: boolean;
		totalSize: number;
	}

	class Connection {
		accessToken: string;
		refreshToken: string;
		instanceUrl: string;
		authorize: (code: string) => void;
		sobject: (resource: string) => SObject;
		query: (query: string) => QueryResult;
		constructor(params: ConnectionOptions);
	}

	class SObject {
		create(object: SalesforceContact): Promise<CRUDResponse>;
		update(object: SalesforceContact): Promise<CRUDResponse>;
		destroy(id: string): Promise<CRUDResponse>;
	}

	class CRUDResponse {
		id: string;
		success: boolean;
		error: CRUDError[];
	}

	class CRUDError {
		name: string;
	}
}
