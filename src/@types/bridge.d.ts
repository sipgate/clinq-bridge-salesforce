declare module "@clinq/bridge" {
	import { Request } from "express";

	enum PhoneNumberLabel {
		WORK = "WORK",
		MOBILE = "MOBILE",
		HOME = "HOME"
	}

	interface PhoneNumber {
		label: PhoneNumberLabel;
		phoneNumber: string;
	}

	interface ContactTemplate {
		name: string | null;
		firstName: string | null;
		lastName: string | null;
		email: string | null;
		organization: string | null;
		phoneNumbers: PhoneNumber[];
	}

	interface Contact extends ContactTemplate {
		id: string;
		contactUrl: string | null;
		avatarUrl: string | null;
	}

	interface ContactUpdate extends ContactTemplate {
		id: string;
	}

	class ServerError {
		static captureStackTrace(p0: any, p1: any): any;
		static prepareStackTrace: any;
		static stackTraceLimit: number;
		constructor(status: any, message: any);
		status: any;
	}

	interface Config {
		apiKey: string;
		apiUrl: string;
	}

	interface Adapter {
		getContacts: (config: Config) => Promise<Contact[]>;
		createContact?: (config: Config, contact: ContactTemplate) => Promise<Contact>;
		updateContact?: (config: Config, id: string, contact: ContactUpdate) => Promise<Contact>;
		deleteContact?: (config: Config, id: string) => Promise<void>;
		getHealth?: () => Promise<void>;
		getOAuth2RedirectUrl?: () => Promise<string>;
		handleOAuth2Callback?: (req: Request) => Promise<Config>;
	}
	function start(adapter: any): any;
}
