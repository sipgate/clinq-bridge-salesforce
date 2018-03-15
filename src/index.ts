import { CrmAdapter, CrmConfig, Contact, start } from "clinq-crm-bridge";
import { startOAuthProvider } from "./oauth-provider";

class MyCrmAdapter implements CrmAdapter {
	public async getContacts(config: CrmConfig): Promise<Contact[]> {
		return [];
	}
}

start(new MyCrmAdapter());

startOAuthProvider();
