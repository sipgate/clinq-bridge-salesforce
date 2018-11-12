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
