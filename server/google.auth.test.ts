import { describe, it, expect } from "vitest";

describe("Google OAuth configuration", () => {
  it("should have GOOGLE_CLIENT_ID set", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeTruthy();
    expect(clientId).toContain(".apps.googleusercontent.com");
  });

  it("should have GOOGLE_CLIENT_SECRET set", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeTruthy();
    expect(clientSecret!.length).toBeGreaterThan(10);
  });

  it("should construct a valid Google OAuth authorization URL", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const redirectUri = "https://bracketbuddy.unrivaledbusinesssolutions.com/api/oauth/callback";
    const state = Buffer.from(JSON.stringify({ redirectUri, returnTo: "/" })).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    expect(authUrl).toContain("accounts.google.com");
    expect(authUrl).toContain("client_id=");
    expect(authUrl).toContain("redirect_uri=");
    expect(authUrl).toContain("scope=openid");
  });
});
