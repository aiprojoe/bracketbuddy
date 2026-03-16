import { describe, it, expect } from "vitest";

describe("Email service", () => {
  it("RESEND_API_KEY is set in environment", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("OWNER_EMAIL is set in environment", () => {
    expect(process.env.OWNER_EMAIL).toBeTruthy();
    expect(process.env.OWNER_EMAIL).toContain("@");
  });

  it("Resend API key is valid (can reach Resend domains endpoint)", async () => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { object: string };
    expect(data.object).toBe("list");
  });

  it("unrivaledbusinesssolutions.com domain is verified in Resend", async () => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const data = await res.json() as { data: Array<{ name: string; status: string }> };
    const domain = data.data.find((d) => d.name === "unrivaledbusinesssolutions.com");
    expect(domain).toBeDefined();
    expect(domain?.status).toBe("verified");
  });
});
