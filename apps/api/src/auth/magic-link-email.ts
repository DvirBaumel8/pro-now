import type { OutgoingEmail } from "../infra/email/email-provider.js";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The sign-in email (Hebrew, RTL). The link works once, for 15 minutes. */
export function magicLinkEmail(to: string, url: string): OutgoingEmail {
  const subject = "הקישור שלך לכניסה ל-PRO NOW";
  const text = [
    "שלום,",
    "",
    "כדי להיכנס ל-PRO NOW, פתחו את הקישור:",
    url,
    "",
    "הקישור תקף ל-15 דקות ולכניסה אחת.",
    "אם לא ביקשתם להיכנס, אפשר להתעלם מהמייל הזה.",
  ].join("\n");
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="font-family:system-ui,sans-serif;direction:rtl;text-align:right">
<p>שלום,</p>
<p>כדי להיכנס ל-PRO NOW, לחצו על הכפתור:</p>
<p><a href="${escape(url)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;border-radius:10px;text-decoration:none">כניסה ל-PRO NOW</a></p>
<p style="color:#555">הקישור תקף ל-15 דקות ולכניסה אחת. אם לא ביקשתם להיכנס, אפשר להתעלם מהמייל הזה.</p>
</body></html>`;
  return { to, subject, text, html };
}
