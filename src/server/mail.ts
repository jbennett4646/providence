import "server-only";

/*
 * Outgoing email. With RESEND_API_KEY set, mail goes through Resend
 * (https://resend.com); otherwise it is written to the server log, which is
 * enough for development.
 */

export type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Providence Home Academy <no-reply@providence-home.academy>";
  if (!key) {
    console.info(`[mail] to ${mail.to}: ${mail.subject}\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
  });
  if (!res.ok) throw new Error(`Mail failed: ${res.status} ${await res.text()}`);
}

