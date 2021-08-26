import { Config } from "@clinq/bridge";
import { anonymizeKey } from "./anonymize-key";

export const log = (config: Config, message: string, data: any = null) => {
  const anonymizedKey = anonymizeKey(config.apiKey);
  const formattedMessage = `[${anonymizedKey}] - ${message}`;
  data ? console.log(formattedMessage, data) : console.log(formattedMessage);
};
