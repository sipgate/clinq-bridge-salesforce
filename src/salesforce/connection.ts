import { Config } from "@clinq/bridge";
import { Connection } from "jsforce";
import { oauth2 } from "./auth";

export function createSalesforceConnection({
  apiKey,
  apiUrl,
}: Config): Connection {
  const [accessToken, refreshToken] = apiKey.split(":");
  return new Connection({
    accessToken,
    instanceUrl: apiUrl,
    oauth2,
    refreshToken,
  });
}
