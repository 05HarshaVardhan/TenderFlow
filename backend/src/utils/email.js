const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send';

function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.GMAIL_SENDER || process.env.EMAIL_USER;
}

async function sendEmail({ to, subject, html }) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this Node runtime');
  }

  const apiKey =
    process.env.MAILJET_API_KEY ||
    process.env.MJ_APIKEY_PUBLIC;
  const apiSecret =
    process.env.MAILJET_API_SECRET ||
    process.env.MJ_APIKEY_PRIVATE;
  const from = getFromAddress();
  if (!apiKey) throw new Error('Missing MAILJET_API_KEY');
  if (!apiSecret) throw new Error('Missing MAILJET_API_SECRET');
  if (!from) throw new Error('Missing EMAIL_FROM/GMAIL_SENDER');
  if (!to) throw new Error('Missing recipient email');

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ Email: email }));
  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const response = await fetch(MAILJET_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: from,
            Name: process.env.EMAIL_FROM_NAME || 'TenderFlow'
          },
          To: recipients,
          Subject: subject || '',
          HTMLPart: html || ''
        }
      ]
    })
  });

  const responseText = await response.text();
  let result = {};
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (_) {
    result = {};
  }

  if (!response.ok) {
    const details =
      result?.ErrorInfo ||
      result?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
      result?.message ||
      result?.error ||
      responseText ||
      `HTTP ${response.status}`;
    throw new Error(`Mailjet send failed: ${details}`);
  }

  return result;
}

module.exports = { sendEmail };
