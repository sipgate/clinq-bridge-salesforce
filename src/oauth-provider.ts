import { OAuth2, Connection } from "jsforce";
import * as express from "express";
import { Request, Response } from "express";

const PORT = 8081;

const {
	SF_OAUTH_PROVIDER_CLIENT_ID: clientId,
	SF_OAUTH_PROVIDER_CLIENT_SECRET: clientSecret,
	SF_OAUTH_PROVIDER_REDIRECT_URI: redirectUri
} = process.env;

export const startOAuthProvider = () => {
	if (!clientId || !clientSecret || !redirectUri) {
		return;
	}

	const oauth2 = new OAuth2({
		clientId,
		redirectUri,
		clientSecret
	});

	const app: express.Application = express();

	app.get("/oauth2/auth", (req: Request, res: Response) => {
		res.redirect(oauth2.getAuthorizationUrl({ scope: "api" }));
	});

	app.get("/oauth2/callback", async (req: Request, res: Response) => {
		try {
			const conn = new Connection({ oauth2 });
			const { code } = req.query;
			await conn.authorize(code);
			console.log("Received access token", conn.accessToken);
			res.send("success");
		} catch (error) {
			console.log("Could not get access token", error.message);
			res.send("failure");
		}
	});

	app.listen(PORT, () => {
		console.log("OAuth provider listening on port", PORT);
	});
};
