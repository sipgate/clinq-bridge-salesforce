import { start as startBridge } from "@clinq/bridge";
import SalesforceAdapter from "./SalesforceAdapter";

startBridge(new SalesforceAdapter());
