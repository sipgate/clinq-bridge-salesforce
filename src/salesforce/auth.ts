import { OAuth2, OAuth2Options } from "jsforce";
import { parseEnvironment } from "../util";

export const oauth2Options: OAuth2Options = parseEnvironment();
export const oauth2: OAuth2 = new OAuth2(oauth2Options);
export const RELEVANT_CONTACT_FIELDS = [
  "Id",
  "Email",
  "Name",
  "FirstName",
  "LastName",
  "Phone",
  "MobilePhone",
  "HomePhone",
  "CreatedDate",
];
