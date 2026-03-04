const Mailjet = require('node-mailjet');

function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.GMAIL_SENDER || process.env.EMAIL_USER;
}

async function sendEmail({ to, subject, html }) {
  const apiKey =
    process.env.MJ_APIKEY_PUBLIC ||
    process.env.MAILJET_API_KEY ||
    process.env.MAILJET_API_PUBLIC ||
    process.env.MAILJET_PUBLIC_KEY;
  const apiSecret =
    process.env.MJ_APIKEY_PRIVATE ||
    process.env.MAILJET_API_SECRET ||
    process.env.MAILJET_API_PRIVATE ||
    process.env.MAILJET_SECRET_KEY;
  const from = getFromAddress();

  if (!apiKey) throw new Error('Missing MJ_APIKEY_PUBLIC/MAILJET_API_KEY');
  if (!apiSecret) throw new Error('Missing MJ_APIKEY_PRIVATE/MAILJET_API_SECRET');
  if (!from) throw new Error('Missing EMAIL_FROM/GMAIL_SENDER');
  if (!to) throw new Error('Missing recipient email');

  const mailjet = Mailjet.apiConnect(apiKey, apiSecret);
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ Email: email }));

  const requestBody = {
    Messages: [
      {
        From: {
          Email: from,
          Name: process.env.EMAIL_FROM_NAME || 'TenderFlow'
        },
        To: recipients,
        Subject: subject || '',
        TextPart: 'Please view this email in an HTML-compatible client.',
        HTMLPart: html || ''
      }
    ]
  };

  try {
    const result = await mailjet.post('send', { version: 'v3.1' }).request(requestBody);
    return result?.body || result;
  } catch (err) {
    const details =
      err?.response?.body?.ErrorInfo ||
      err?.response?.body?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
      err?.response?.body?.message ||
      err?.message ||
      `HTTP ${err?.statusCode || 500}`;
    throw new Error(`Mailjet send failed: ${details}`);
  }
}

module.exports = { sendEmail };
