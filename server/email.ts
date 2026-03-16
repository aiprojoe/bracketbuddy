import { Resend } from "resend";
import { ENV } from "./_core/env";

const FROM_ADDRESS = "BracketBuddy <noreply@unrivaledbusinesssolutions.com>";

function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(ENV.resendApiKey);
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "🏀 Welcome to BracketBuddy — Build Your 2026 Bracket!",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#1a0a00,#2d1200);padding:40px 40px 30px;text-align:center;">
                    <div style="font-size:13px;font-weight:700;letter-spacing:3px;color:#e85d04;margin-bottom:8px;">POWERED BY UNRIVALED BUSINESS SOLUTIONS</div>
                    <div style="font-size:42px;font-weight:900;letter-spacing:-1px;color:#fff;line-height:1;">BRACKET<span style="color:#e85d04;">BUDDY</span></div>
                    <div style="font-size:12px;letter-spacing:4px;color:#888;margin-top:8px;">THE AI-POWERED MARCH MADNESS EXPERIENCE</div>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <p style="color:#fff;font-size:22px;font-weight:700;margin:0 0 16px;">Welcome, ${name}! 🎉</p>
                    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      You're in! The 2026 NCAA Tournament bracket is set and it's time to make your picks. 
                      Use AI-powered analysis, voice picks, and upset predictions to build the ultimate bracket.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                      <tr>
                        <td style="background:#1a1a1a;border-radius:8px;padding:16px 20px;border-left:3px solid #e85d04;">
                          <div style="color:#e85d04;font-size:12px;font-weight:700;letter-spacing:2px;margin-bottom:4px;">⏰ IMPORTANT DEADLINE</div>
                          <div style="color:#fff;font-size:15px;font-weight:600;">Brackets lock March 20 at 12:15 PM ET</div>
                          <div style="color:#888;font-size:13px;margin-top:4px;">First tip-off is at 12:15 PM — submit before then!</div>
                        </td>
                      </tr>
                    </table>
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">
                      <tr>
                        <td width="33%" style="padding:0 8px 0 0;vertical-align:top;">
                          <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
                            <div style="font-size:24px;margin-bottom:8px;">🤖</div>
                            <div style="color:#fff;font-size:13px;font-weight:700;">AI Picks</div>
                            <div style="color:#888;font-size:12px;margin-top:4px;">Get AI-powered upset predictions</div>
                          </div>
                        </td>
                        <td width="33%" style="padding:0 4px;vertical-align:top;">
                          <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
                            <div style="font-size:24px;margin-bottom:8px;">🎤</div>
                            <div style="color:#fff;font-size:13px;font-weight:700;">Voice Picks</div>
                            <div style="color:#888;font-size:12px;margin-top:4px;">Fill your bracket by talking</div>
                          </div>
                        </td>
                        <td width="33%" style="padding:0 0 0 8px;vertical-align:top;">
                          <div style="background:#1a1a1a;border-radius:8px;padding:16px;text-align:center;">
                            <div style="font-size:24px;margin-bottom:8px;">🏆</div>
                            <div style="color:#fff;font-size:13px;font-weight:700;">Leaderboard</div>
                            <div style="color:#888;font-size:12px;margin-top:4px;">Compete for bragging rights</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://bracketbuddy.unrivaledbusinesssolutions.com/bracket" 
                             style="display:inline-block;background:#e85d04;color:#fff;font-size:16px;font-weight:800;letter-spacing:1px;text-decoration:none;padding:16px 40px;border-radius:8px;">
                            BUILD MY BRACKET →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#0a0a0a;padding:24px 40px;border-top:1px solid #222;text-align:center;">
                    <p style="color:#555;font-size:12px;margin:0;">© 2026 Unrivaled Business Solutions · <a href="https://bracketbuddy.unrivaledbusinesssolutions.com" style="color:#e85d04;text-decoration:none;">bracketbuddy.unrivaledbusinesssolutions.com</a></p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
    return false;
  }
}

// ─── Bracket Lock Reminder ────────────────────────────────────────────────────

export async function sendLockReminderEmail(to: string, name: string): Promise<boolean> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "⏰ LAST CHANCE: Brackets lock in 24 hours — BracketBuddy",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a0000,#2d0000);padding:40px 40px 30px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:8px;">⏰</div>
                    <div style="font-size:42px;font-weight:900;letter-spacing:-1px;color:#fff;line-height:1;">BRACKET<span style="color:#e85d04;">BUDDY</span></div>
                    <div style="font-size:14px;font-weight:700;color:#ff4444;margin-top:12px;letter-spacing:2px;">BRACKETS LOCK TOMORROW</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="color:#fff;font-size:22px;font-weight:700;margin:0 0 16px;">Hey ${name}, time is running out!</p>
                    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      The 2026 NCAA Tournament tips off <strong style="color:#fff;">March 20 at 12:15 PM ET</strong>. 
                      Once the first game starts, brackets are locked forever. Don't miss your chance!
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 32px;">
                      <tr>
                        <td style="background:#1a0000;border-radius:8px;padding:20px;text-align:center;border:1px solid #440000;">
                          <div style="color:#ff4444;font-size:28px;font-weight:900;letter-spacing:2px;">MARCH 20 · 12:15 PM ET</div>
                          <div style="color:#888;font-size:13px;margin-top:8px;">Bracket submission deadline</div>
                        </td>
                      </tr>
                    </table>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://bracketbuddy.unrivaledbusinesssolutions.com/bracket" 
                             style="display:inline-block;background:#e85d04;color:#fff;font-size:16px;font-weight:800;letter-spacing:1px;text-decoration:none;padding:16px 40px;border-radius:8px;">
                            FINISH MY BRACKET →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#0a0a0a;padding:24px 40px;border-top:1px solid #222;text-align:center;">
                    <p style="color:#555;font-size:12px;margin:0;">© 2026 Unrivaled Business Solutions · <a href="https://bracketbuddy.unrivaledbusinesssolutions.com" style="color:#e85d04;text-decoration:none;">bracketbuddy.unrivaledbusinesssolutions.com</a></p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send lock reminder email:", err);
    return false;
  }
}

// ─── Bulk Lock Reminder (all users with email) ────────────────────────────────

export async function sendBulkLockReminders(
  users: Array<{ email: string | null; name: string | null }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    if (!user.email) continue;
    const ok = await sendLockReminderEmail(user.email, user.name ?? "Bracket Fan");
    if (ok) sent++;
    else failed++;
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }
  return { sent, failed };
}
