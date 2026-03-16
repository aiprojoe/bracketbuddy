import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import axios from "axios";
import { sendWelcomeEmail } from "../email";
import { getUserByOpenId } from "../db";

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
  // Google OAuth initiation — frontend redirects here to start sign-in
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const returnTo = getQueryParam(req, "returnTo") ?? "/";
    const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
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

    let redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
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
