/**
 * Contact form delivery — shared by the Worker and the Pages Function.
 * ---------------------------------------------------------------------------
 * Receives the Wave Car Studio enquiry form and delivers it to
 * audit@wavecarstudio.co.in.
 *
 * `handleContact(request, env)` is transport-agnostic: it takes a standard
 * `Request` and the binding object, and returns a standard `Response`. The
 * Worker entry (`worker.js`) and the Pages Function (`functions/api/contact.js`)
 * both delegate here, so there is exactly one implementation.
 *
 * The domain's mail is hosted on Zoho (MX: mx.zoho.in), so Zoho is the
 * preferred transport. Cloudflare Workers cannot open an SMTP connection, so
 * the send goes through Zoho's HTTPS Mail API instead.
 *
 * Transports, in priority order:
 *
 *   1. Zoho Mail API (OAuth 2.0) — uses the existing Zoho mailbox
 *        ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 *        optional: ZOHO_ACCOUNT_ID, ZOHO_DC (default "in"), CONTACT_FROM
 *
 *   2. Zoho ZeptoMail (transactional add-on, single API token)
 *        ZEPTOMAIL_TOKEN
 *        optional: ZEPTOMAIL_DC (default "in")
 *
 *   3. Cloudflare Email Service (native binding, Workers Paid plan)
 *        an `EMAIL` binding of type "Email"
 *
 *   4. Resend (fallback, free tier)
 *        RESEND_API_KEY
 *
 * Optional environment variables:
 *   CONTACT_TO    recipient      (default: audit@wavecarstudio.co.in)
 *   CONTACT_FROM  sender         (default: Wave Car Studio <audit@wavecarstudio.co.in>)
 */

const DEFAULT_TO = "audit@wavecarstudio.co.in";
const DEFAULT_FROM = "Wave Car Studio <audit@wavecarstudio.co.in>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function extractEmail(value) {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : String(value)).trim();
}

function extractName(value) {
  const match = String(value).match(/^\s*"?([^"<]*)"?\s*</);
  return match ? match[1].trim() : "";
}

function readFields(data) {
  return {
    name: String(data.name || "").trim().slice(0, 200),
    contact: String(data.contact || "").trim().slice(0, 200),
    vehicle: String(data.vehicle || "").trim().slice(0, 200),
    service: String(data.service || "").trim().slice(0, 120),
    message: String(data.message || "").trim().slice(0, 5000),
    honeypot: String(data.company || "").trim(),
  };
}

function buildEmail(fields) {
  const { name, contact, vehicle, service, message } = fields;
  const serviceLabel = service && service !== "Not sure yet" ? service : "Not sure yet";

  const subject =
    `Website enquiry — ${name}` + (serviceLabel !== "Not sure yet" ? ` · ${serviceLabel}` : "");

  const text = [
    "New enquiry from wavecarstudio.co.in",
    "",
    `Name:    ${name}`,
    `Contact: ${contact}`,
    `Vehicle: ${vehicle || "—"}`,
    `Service: ${serviceLabel}`,
    "",
    "Message:",
    message || "—",
  ].join("\n");

  const row = (label, value) =>
    `<tr>
      <td style="padding:6px 16px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:14px;vertical-align:top">${escapeHtml(value)}</td>
    </tr>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f8;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="padding:20px 24px;background:#0A0C0F;color:#ffffff">
      <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af">Wave Car Studio</p>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600">New website enquiry</h1>
    </div>
    <div style="padding:20px 24px">
      <table style="border-collapse:collapse;width:100%">
        ${row("Name", name)}
        ${row("Contact", contact)}
        ${row("Vehicle", vehicle || "—")}
        ${row("Service", serviceLabel)}
      </table>
      <p style="margin:18px 0 6px;color:#6b7280;font-size:13px">Message</p>
      <p style="margin:0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#111827;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(message || "—")}</p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">
      Sent from the contact form on wavecarstudio.co.in
    </div>
  </div>
</body></html>`;

  return { subject, text, html };
}

/* ------------------------------------------------------------------ Zoho --- */

let zohoAccountCache = null;

async function getZohoAccessToken(env) {
  const dc = env.ZOHO_DC || "in";
  const response = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      refresh_token: env.ZOHO_REFRESH_TOKEN,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!data.access_token) {
    throw new Error("Zoho token refresh failed: " + JSON.stringify(data));
  }
  return data.access_token;
}

async function getZohoAccountId(env, token) {
  if (env.ZOHO_ACCOUNT_ID) return env.ZOHO_ACCOUNT_ID;

  const dc = env.ZOHO_DC || "in";
  if (zohoAccountCache && zohoAccountCache.dc === dc) return zohoAccountCache.accountId;

  const response = await fetch(`https://mail.zoho.${dc}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  const account = data && data.data && data.data[0];
  if (!account || !account.accountId) {
    throw new Error("Zoho account lookup failed: " + JSON.stringify(data));
  }

  zohoAccountCache = { dc, accountId: account.accountId };
  return account.accountId;
}

async function sendViaZohoMail(env, message) {
  const dc = env.ZOHO_DC || "in";
  const token = await getZohoAccessToken(env);
  const accountId = await getZohoAccountId(env, token);

  const response = await fetch(`https://mail.zoho.${dc}/api/accounts/${accountId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fromAddress: extractEmail(message.from),
      toAddress: message.to,
      subject: message.subject,
      content: message.html,
      mailFormat: "html",
    }),
  });

  const data = await response.json().catch(() => ({}));
  const code = data && data.status && Number(data.status.code);
  if (!response.ok || (code && code >= 400)) {
    throw new Error("Zoho send failed: " + response.status + " " + JSON.stringify(data));
  }
  return data;
}

/* -------------------------------------------------------------- ZeptoMail --- */

async function sendViaZeptoMail(env, message) {
  const dc = env.ZEPTOMAIL_DC || "in";
  const response = await fetch(`https://api.zeptomail.${dc}/v1.1/email`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-enczapikey ${env.ZEPTOMAIL_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: {
        address: extractEmail(message.from),
        name: extractName(message.from) || "Wave Car Studio",
      },
      to: [
        {
          email_address: { address: message.to, name: "Wave Car Studio" },
        },
      ],
      ...(message.replyTo ? { reply_to: [{ address: message.replyTo }] } : {}),
      subject: message.subject,
      htmlbody: message.html,
      textbody: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("ZeptoMail send failed: " + response.status + " " + detail);
  }
  return response.json().catch(() => ({}));
}

/* ----------------------------------------------------------------- Resend --- */

async function sendViaResend(env, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Resend rejected the message: " + response.status + " " + detail);
  }
  return response.json().catch(() => ({}));
}

/* ------------------------------------------------------------------ route --- */

/**
 * Handle one enquiry submission.
 *
 * @param {Request} request  Incoming request (JSON, form-encoded, or multipart).
 * @param {Record<string, unknown>} env  Worker/Pages bindings and secrets.
 * @returns {Promise<Response>}
 */
export async function handleContact(request, env) {
  let data;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return json({ success: false, message: "Invalid request." }, 400);
  }

  const fields = readFields(data);

  // Honeypot: real visitors never see or fill this field.
  if (fields.honeypot) {
    return json({ success: true });
  }

  if (!fields.name || !fields.contact) {
    return json(
      { success: false, message: "Please add your name and a phone number or email." },
      400,
    );
  }

  const to = env.CONTACT_TO || DEFAULT_TO;
  const from = env.CONTACT_FROM || DEFAULT_FROM;
  const replyTo = EMAIL_RE.test(fields.contact) ? fields.contact : undefined;
  const { subject, text, html } = buildEmail(fields);
  const message = { from, to, subject, text, html, replyTo };

  try {
    if (env.ZOHO_REFRESH_TOKEN && env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET) {
      await sendViaZohoMail(env, message);
    } else if (env.ZEPTOMAIL_TOKEN) {
      await sendViaZeptoMail(env, message);
    } else if (env.EMAIL && typeof env.EMAIL.send === "function") {
      // Cloudflare Email Service (native binding).
      await env.EMAIL.send({
        to,
        from,
        subject,
        text,
        html,
        ...(replyTo ? { replyTo } : {}),
      });
    } else if (env.RESEND_API_KEY) {
      await sendViaResend(env, message);
    } else {
      console.error(
        "No email transport configured: set ZOHO_* / ZEPTOMAIL_TOKEN / RESEND_API_KEY or an EMAIL binding.",
      );
      return json(
        { success: false, message: "Email is not configured on this site yet." },
        500,
      );
    }
  } catch (error) {
    console.error("Contact form send failed:", error);
    return json(
      { success: false, message: "The message could not be sent. Please email or call us." },
      502,
    );
  }

  // Non-JavaScript submit: send the visitor back to the contact page.
  // Use the clean URL — the asset router redirects `/contact.html` to `/contact`,
  // so linking the final path avoids a second hop.
  if ((request.headers.get("accept") || "").includes("text/html")) {
    return Response.redirect(new URL("/contact?sent=1", request.url).toString(), 303);
  }

  return json({ success: true, message: "Thank you — your enquiry has been sent." });
}

/** Response for any non-POST request to the endpoint. */
export function methodNotAllowed() {
  return json({ success: false, message: "Use POST to submit the enquiry form." }, 405);
}
