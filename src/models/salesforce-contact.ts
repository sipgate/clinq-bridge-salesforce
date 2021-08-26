interface SalesforceAttributes {
  type: string | undefined;
  url: string | undefined;
}

export interface SalesforceContact {
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
