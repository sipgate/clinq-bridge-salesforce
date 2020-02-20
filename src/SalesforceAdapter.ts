import { Adapter, Config, Contact, ContactTemplate, ServerError, ContactUpdate, CallEvent, CallDirection } from "@clinq/bridge";
import { createSalesforceConnection, querySalesforceContacts, createContactResponse, updateStandardContact, tryUpdateContactWithCustomHomePhone, oauth2, getContactByPhoneOrMobilePhone, getContactByHomePhone, getContactByCustomHomePhone } from "./salesforce";
import { Connection, SuccessResult } from "jsforce";
import { anonymizeKey, convertFromSalesforceContact, convertToSalesforceContact, formatDuration } from "./util";
import { Request } from "express";
import { log } from "./util/logger";
import { SalesforceContact } from "./models/salesforce-contact";


export default class SalesforceAdapter implements Adapter {
	public async getContacts(config: Config): Promise<Contact[]> {
		try {
			const connection = createSalesforceConnection(config);
			const contacts: SalesforceContact[] = await querySalesforceContacts(config, connection, []);
			const anonymizedKey = anonymizeKey(config.apiKey);
			log(
				config,
				`Found ${contacts.length} Salesforce contacts`,
				{
					apiUrl: config.apiUrl
				}
			);
			const parsedContacts: Contact[] = contacts.map(convertFromSalesforceContact);

			log(
				config,
				`Parsed ${parsedContacts.length} contacts`
			);

			return parsedContacts;
		} catch (error) {
			log(
				config,
				`Could not fetch contacts: ${error.message}`,
				error
			);
			console.log();
			return [];
		}
	}

	public async createContact(config: Config, contact: ContactTemplate): Promise<Contact> {
		const salesforceContact = convertToSalesforceContact(contact);
		log(config, "Creating contect");
		try {
			const connection = createSalesforceConnection(config);
			const response = await connection.sobject("Contact").create(salesforceContact);
			const successResponse = response as SuccessResult;
			return createContactResponse(successResponse.id, contact);
		} catch (error) {
			log(config, "Could not create contact", error);
			if (error.name === "DUPLICATES_DETECTED") {
				throw new ServerError(403, "Contact already exists.");
			}
		}
	}

	public async updateContact(config: Config, id: string, contact: ContactUpdate): Promise<Contact> {
		return tryUpdateContactWithCustomHomePhone(config, id, contact);
		try {
			const contactResponse = await updateStandardContact(contact, config, id);
			return contactResponse;
		} catch (error) {
			log(
				config,
				"Could not update contact",
				error
			);
			if (error.name === "ENTITY_IS_DELETED" || error.name === "INVALID_CROSS_REFERENCE_KEY") {
				throw new ServerError(404, "Contact not found.");
			}
			// Apparently sometimes a salesforce contact doesn't have HomePhone as a default field
			// We then try to save the number in HomePhone__c as a custom field
			if (/HomePhone/g.test(error.message)) {
				tryUpdateContactWithCustomHomePhone(config, id, contact);
			}
		}
	}

	public async deleteContact(config: Config, id: string): Promise<void> {
		try {
			const connection = createSalesforceConnection(config);
			await connection.sobject("Contact").destroy(id);
		} catch (error) {
			log(config, "Could not delete contact", error);
			if (error.name === "ENTITY_IS_DELETED" || error.name === "INVALID_CROSS_REFERENCE_KEY") {
				throw new ServerError(404, "Contact not found.");
			}
		}
	}

	public getOAuth2RedirectUrl(): Promise<string> {
		const redirectUrl: string = oauth2.getAuthorizationUrl({
			scope: "api refresh_token offline_access"
		});
		return Promise.resolve(redirectUrl);
	}

	public async handleOAuth2Callback(req: Request): Promise<{ apiKey: string; apiUrl: string }> {
		// TODO: fix any -> add refreshToken to salesforce connection
		// tslint:disable-next-line:no-any
		const connection: any = new Connection({ oauth2 });
		const { code } = req.query;
		await connection.authorize(code);
		return {
			apiKey: `${connection.accessToken}:${connection.refreshToken}`,
			apiUrl: connection.instanceUrl
		};
	}

	public async handleCallEvent(
		config: Config,
		{ direction, from, to, channel, start, end }: CallEvent
	): Promise<void> {
		try {
			const connection = createSalesforceConnection(config);
			const phoneNumber = direction === CallDirection.IN ? from : to;
			const anonymizedKey = anonymizeKey(config.apiKey);
			const phoneContact = await getContactByPhoneOrMobilePhone(config, connection, phoneNumber);
			const homePhoneContact = await getContactByHomePhone(config, connection, phoneNumber);
			const customHomePhoneContact = await getContactByCustomHomePhone(config, connection, phoneNumber);

			const contact = phoneContact || homePhoneContact || customHomePhoneContact;

			if (!contact) {
				log(
					config,
					`Unable to find a contact`,
					{phoneNumber}
				);
				return;
			}

			const directionInfo = direction === CallDirection.IN ? "Incoming" : "Outgoing";
			const date = new Date(start);
			const duration = formatDuration(end - start);

			const task = {
				WhoId: contact.Id,
				CallDisposition: channel.name,
				ActivityDate: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
				Status: "Completed",
				TaskSubType: "Call",
				Subject: `${directionInfo} CLINQ call in "${channel.name}" (${duration})`
			};
			await connection.sobject("Task").create(task);
			log(
				config,
				`Successfully added call event`,
				{phoneNumber}
			);
		} catch (error) {
			log(
				config,
				"Could not save CallEvent",
				error
			);
			throw new ServerError(400, "Could not save CallEvent");
		}
	}
}
