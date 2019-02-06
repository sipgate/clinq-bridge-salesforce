import { PhoneNumberLabel } from "@clinq/bridge";
import { PhoneNumberType } from "../models";

export const PhoneNumberTypes: PhoneNumberType[] = [
	{
		label: PhoneNumberLabel.WORK,
		property: "Phone"
	},
	{
		label: PhoneNumberLabel.MOBILE,
		property: "MobilePhone"
	},
	{
		label: PhoneNumberLabel.HOME,
		property: "HomePhone"
	}
];
