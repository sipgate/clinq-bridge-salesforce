import { SalesforceAttributes } from "jsforce";

declare module "jsforce" {
	interface SalesforceAttributes {
		type: string | undefined;
		url: string | undefined;
	}

	interface SalesforceContact {
		Id?: string;
		Email: string | null;
		Name?: string;
		FirstName: string;
		LastName: string;
		Phone?: string | null;
		MobilePhone?: string | null;
		HomePhone?: string | null;
		CreatedDate?: string;
		attributes?: SalesforceAttributes | null;
	}

	interface SalesforceTask {
		Id?: string;
		WhoId?: string;
		CallType?: "Inbound" | "Outbound";
		CallDurationInSeconds?: number;
		CallDisposition?: string;
		ActivityDate?: string;
		TaskSubType?: string;
		Status?: string;
		Subject?: string;
		CallObject?: string;
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
		create(object: SalesforceContact | SalesforceTask): Promise<CRUDResponse>;
		update(object: SalesforceContact): Promise<CRUDResponse>;
		destroy(id: string): Promise<CRUDResponse>;
		select(fields: string): this;
		execute(callback: () => void): this;
		where(query: string): this;
		limit(limit: number): this;
		orderby(field: string, mode: string): this;
		execute<T>(callback: (error: Error, records: T[]) => T[]): Promise<T[]>;
		describe(callback: (error: Error, meta: Meta) => void): this;
		find(query: any): this;
	}

	interface FieldDescription {
		name: string;
	}

	interface Meta {
		fields: FieldDescription[];
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
