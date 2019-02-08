const ANONYMIZED_KEY_LENGTH = 8;

export function anonymizeKey(apiKey: string): string {
	const [, refreshToken] = apiKey.split(":");
	return `***${refreshToken.substr(
		refreshToken.length - ANONYMIZED_KEY_LENGTH,
		refreshToken.length
	)}`;
}
