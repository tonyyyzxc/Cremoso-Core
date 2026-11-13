import { getIntegrationCredentials } from "./integrationCredentials.js";

const BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";

function parseSender(sender) {
  const formattedSender = sender.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const name = formattedSender?.[1].trim().replace(/^["']|["']$/g, "");
  const email = formattedSender ? formattedSender[2].trim() : sender.trim();

  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new Error("MAIL_FROM must contain a valid sender email address.");
  }

  return { email, ...(name ? { name } : {}) };
}

async function sendCodeEmail(email, subject, text, html, suppliedCredentials) {
  try {
    const credentials = suppliedCredentials || await getIntegrationCredentials("gmail");
    const { apiKey, sender } = credentials;
    if (!apiKey || !sender) {
      throw new Error("Brevo email is not fully configured.");
    }

    const response = await fetch(BREVO_EMAIL_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(sender),
        to: [{ email }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      let providerMessage = "";
      try {
        const result = JSON.parse(responseText);
        providerMessage = result.message || result.code || "";
      } catch {
        providerMessage = responseText;
      }
      throw new Error(
        `Brevo email request failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : "."}`,
      );
    }
  } catch (error) {
    console.error("Brevo email send failed:", error?.message || error);
    throw error;
  }
}

export async function sendPasswordResetCode(email, code) {
  const subject = "Your Cremoso password reset code";
  const text = `Your password reset code is ${code}. It expires in 10 minutes.`;
  const html = `<p>Your Cremoso password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>`;
  return sendCodeEmail(email, subject, text, html);
}

export async function sendIntegrationCredentialCode(email, code) {
  const subject = "Cremoso integration credential change code";
  const text = `Your verification code is ${code}. It expires in 10 minutes. If you did not request this change, ignore this email.`;
  const html = `<p>Your Cremoso integration credential verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request this change, you can ignore this email.</p>`;
  return sendCodeEmail(email, subject, text, html);
}

export async function sendIntegrationCredentialTestEmail(email, credentials) {
  const subject = "Cremoso Brevo credential test";
  const text = "This test email confirms that the configured Brevo integration can send messages.";
  const html = "<p>This test email confirms that the configured Brevo integration can send messages.</p>";
  return sendCodeEmail(email, subject, text, html, credentials);
}
