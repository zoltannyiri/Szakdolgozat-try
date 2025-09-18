import express from "express";
import { google } from "googleapis";

const router = express.Router();

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.OAUTH_REDIRECT_URI!
);


router.get("/auth", (_req, res) => {
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // kell, hogy kapj refresh tokent
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  return res.redirect(url);
});


router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) return res.status(400).send("No code");
    const { tokens } = await oauth2.getToken(code);


    const refresh = tokens.refresh_token;
    console.log("==== GOOGLE_REFRESH_TOKEN ====");
    console.log(refresh || "NINCS refresh_token – nézd meg a prompt=consent-et");
    console.log("================================");

    return res.send(
      refresh
        ? `<p>Siker! Másold be .env-be:<br><code>GOOGLE_REFRESH_TOKEN=${refresh}</code></p>`
        : "<p>Nincs refresh token. Indítsd újra az /auth-ot prompt=consent-tel, és töröld a korábbi engedélyt a Google Fiókodban.</p>"
    );
  } catch (e) {
    console.error(e);
    res.status(500).send("OAuth error");
  }
});

export default router;
