import { randomUUID } from "node:crypto";
import { google } from "googleapis";

// Send password reset codes through the Gmail API using OAuth credentials.
export async function sendPasswordResetCode(email, code) {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER } =
    process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER) {
    throw new Error("Gmail API is not fully configured.");
  }

  const subject = "Your Cremoso password reset code";
  const text = `Your password reset code is ${code}. It expires in 10 minutes.`;
  const html = `<p>Your Cremoso password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>`;
  const encodedSubject = /^[\x00-\x7F]*$/.test(subject)
    ? subject
    : `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const boundary = `cremoso_${randomUUID()}`;
  const encodeBody = (body) =>
    Buffer.from(body, "utf8").toString("base64").match(/.{1,76}/g).join("\r\n");
  const rawMessage = [
    `From: ${GMAIL_SENDER}`,
    `To: ${email}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeBody(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeBody(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: Buffer.from(rawMessage, "utf8").toString("base64url"),
    },
  });
}
