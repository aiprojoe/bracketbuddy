import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import axios from "axios";
import { sendWelcomeEmail, sendMagicLinkEmail } from "../email";
import { getUserByOpenId, getDb } from "../db";
import { magicLinkTokens } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Build the Google OAuth authorization URL
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function registerOAuthRoutes(app: Express) {
  // Magic link — send sign-in email
  app.post("/api/auth/magic-send", async (req: Request, res: Response) => {
    const { email, name, returnTo = "/" } = req.body as { email?: string; name?: string; returnTo?: string };
    if (!email || !name) {
      res.status(400).json({ error: "email and name are required" });
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    const nameTrimmed = name.trim();
    if (!emailTrimmed.includes("@")) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const dbConn = await getDb();
      if (!dbConn) { res.status(500).json({ error: "DB unavailable" }); return; }
      await dbConn.insert(magicLinkTokens).values({ token, email: emailTrimmed, name: nameTrimmed, expiresAt });
      const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? `${req.protocol}://${req.get("host")}`;
      const magicUrl = `${appUrl}/api/auth/magic-verify?token=${token}&returnTo=${encodeURIComponent(returnTo)}`;
      await sendMagicLinkEmail(emailTrimmed, nameTrimmed, magicUrl);
      res.json({ success: true });
    } catch (err) {
      console.error("[Magic Link] send failed", err);
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  // Magic link — verify token and sign in
  app.get("/api/auth/magic-verify", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    const returnTo = getQueryParam(req, "returnTo") ?? "/";
    if (!token) { res.status(400).json({ error: "token is required" }); return; }
    try {
      const dbConn = await getDb();
      if (!dbConn) { res.status(500).json({ error: "DB unavailable" }); return; }
      const rows = await dbConn.select().from(magicLinkTokens).where(eq(magicLinkTokens.token, token)).limit(1);
      const row = rows[0];
      if (!row) { res.redirect(302, `/login?error=invalid`); return; }
      if (row.usedAt) { res.redirect(302, `/login?error=used`); return; }
      if (new Date() > row.expiresAt) { res.redirect(302, `/login?error=expired`); return; }
      // Mark token as used
      await dbConn.update(magicLinkTokens).set({ usedAt: new Date() }).where(eq(magicLinkTokens.token, token));
      // Upsert user
      const openId = `email:${row.email}`;
      const existingUser = await getUserByOpenId(openId);
      const isNewUser = !existingUser;
      await db.upsertUser({ openId, name: row.name, email: row.email, loginMethod: "magic", lastSignedIn: new Date() });
      if (isNewUser) {
        sendWelcomeEmail(row.email, row.name).catch(console.error);
      }
      const sessionToken = await sdk.createSessionToken(openId, { name: row.name, expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo);
    } catch (err) {
      console.error("[Magic Link] verify failed", err);
      res.redirect(302, `/login?error=server`);
    }
  });

  // Google OAuth initiation — frontend redirects here to start sign-in
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const returnTo = getQueryParam(req, "returnTo") ?? "/";
    const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${appUrl}/api/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ redirectUri, returnTo })).toString("base64url");
    const authUrl = getGoogleAuthUrl(redirectUri, state);
    res.redirect(302, authUrl);
  });

  // Google OAuth callback — Google redirects here after user approves
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? `${req.protocol}://${req.get("host")}`;
    let redirectUri = `${appUrl}/api/oauth/callback`;
    let returnTo = "/";

    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      redirectUri = decoded.redirectUri ?? redirectUri;
      returnTo = decoded.returnTo ?? "/";
    } catch {
      // Ignore malformed state
    }

    try {
      // Exchange authorization code for tokens
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token } = tokenRes.data as {
        id_token: string;
        access_token: string;
      };

      // Fetch user profile from Google
      const userInfoRes = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const googleUser = userInfoRes.data as {
        sub: string;
        name?: string;
        email?: string;
        picture?: string;
      };

      if (!googleUser.sub) {
        res.status(400).json({ error: "Google user sub missing" });
        return;
      }

      // Prefix openId with "google:" to avoid collisions with Manus openIds
      const openId = `google:${googleUser.sub}`;

      // Check if this is a first-time sign-in before upserting
      const existingUser = await getUserByOpenId(openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users
      if (isNewUser && googleUser.email) {
        sendWelcomeEmail(googleUser.email, googleUser.name ?? "Bracket Fan").catch(console.error);
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.status(500).json({ error: "Google OAuth callback failed" });
    }
  });
}
