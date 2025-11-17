import nodemailer from 'nodemailer';

const APP_NAME = process.env.APP_NAME || 'Warehouse';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@warehouse.local';
const DEFAULT_FROM = process.env.EMAIL_FROM || `"${APP_NAME}" <no-reply@warehouse.local>`;
const FRONTEND_BASE_URL = sanitizeBaseUrl(
  process.env.APP_BASE_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173'
);

const ADMIN_RECIPIENT_FALLBACK = process.env.SMTP_USER ? [process.env.SMTP_USER] : [];

export async function getTransporter() {
  let smtpUser = process.env.SMTP_USER;
  let smtpPass = process.env.SMTP_PASS;
  let smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let smtpPort = Number(process.env.SMTP_PORT || 587);

  // Auto-create Ethereal test account if credentials are not provided
  if (!smtpUser || !smtpPass) {
    const testAccount = await nodemailer.createTestAccount();
    smtpUser = testAccount.user;
    smtpPass = testAccount.pass;
    smtpHost = testAccount.smtp.host;
    smtpPort = testAccount.smtp.port;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS || 8000)
  });
}

export async function sendEmail({ to, subject, html, text, from = DEFAULT_FROM }) {
  let transporter;
  try {
    transporter = await getTransporter();
  } catch (err) {
    console.warn('Failed to create SMTP transporter, using log-only fallback:', err.message);
    return logOnlyEmail({ from, to, subject, html, text });
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log('Email sent. Preview URL:', preview);
    }
    return { ok: true, messageId: info.messageId, previewUrl: preview || null };
  } catch (err) {
    if (['ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EAUTH', 'EENVELOPE'].includes(err?.code)) {
      console.warn('SMTP not reachable. Falling back to local stream transport (log-only).');
      return logOnlyEmail({ from, to, subject, html, text });
    }
    throw err;
  }
}

export async function sendLowStockAlertEmail(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true, skipped: true };
  }

  const recipients = getAdminRecipients();
  if (!recipients.length) {
    console.warn('No admin email recipients configured. Skipping low stock alert email.');
    return { ok: false, skipped: true };
  }

  const subject = `⚠️ ${items.length} item${items.length > 1 ? 's are' : ' is'} below the stock threshold`;
  const html = buildTemplate({
    title: 'Low Stock Alert',
    intro: `The following inventory item${items.length > 1 ? 's are' : ' is'} below the configured low-stock threshold.`,
    body: `
      ${renderList(items.map(item => `${item.name} — stock: ${item.currentStock} / threshold: ${item.lowStockThreshold}`))}
      <p style="margin:24px 0 0;color:#475467;font-size:14px;">Review the inventory dashboard to replenish stock.</p>
    `
  });
  const text = [
    'Low stock alert:',
    ...items.map(item => `• ${item.name} — stock: ${item.currentStock} / threshold: ${item.lowStockThreshold}`),
    '',
    `Review: ${FRONTEND_BASE_URL}/items`
  ].join('\n');

  return sendEmail({
    to: recipients.join(', '),
    subject,
    html,
    text
  });
}

export async function sendMovementRequestEmail({ movement }) {
  if (!movement) {
    return { ok: false, skipped: true };
  }

  const recipients = getAdminRecipients();
  if (!recipients.length) {
    console.warn('No admin email recipients configured. Skipping movement request email.');
    return { ok: false, skipped: true };
  }

  const subject = `📦 ${movement.requestedBy?.email || 'User'} requested ${movement.quantity} ${movement.item?.name || 'item(s)'}`;
  const details = [
    ['Item', `${movement.item?.name || 'Unknown'}${movement.item?.sku ? ` (${movement.item.sku})` : ''}`],
    ['Type', movement.type],
    ['Quantity', movement.quantity],
    ['Requested By', movement.requestedBy?.email || 'N/A'],
    ['Notes', movement.notes?.trim() || '—']
  ];

  const reviewUrl = `${FRONTEND_BASE_URL}/movements`;
  const html = buildTemplate({
    title: 'New Movement Request',
    intro: 'A user submitted a new movement request that is waiting for administrator approval.',
    body: `
      ${renderDetailsTable(details)}
      ${renderCTA('Review request', reviewUrl)}
    `
  });
  const text = [
    'New movement request:',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `Review: ${reviewUrl}`
  ].join('\n');

  return sendEmail({
    to: recipients.join(', '),
    subject,
    html,
    text
  });
}

export async function sendMovementStatusEmail({ movement, status, reason }) {
  if (!movement?.requestedBy?.email) {
    console.warn('Movement requester email missing. Skipping movement status email.');
    return { ok: false, skipped: true };
  }

  const normalizedStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const isApproved = normalizedStatus === 'APPROVED';
  const subject = isApproved ? '✅ Movement Request Approved' : '❌ Movement Request Rejected';
  const summary = isApproved
    ? `Good news! Your ${movement.type?.toLowerCase() || ''} request for ${movement.quantity} ${movement.item?.name || 'item(s)'} has been approved.`
    : `Your ${movement.type?.toLowerCase() || ''} request for ${movement.quantity} ${movement.item?.name || 'item(s)'} was rejected${reason ? `: ${reason}` : '.'}`;

  const details = [
    ['Item', `${movement.item?.name || 'Unknown'}${movement.item?.sku ? ` (${movement.item.sku})` : ''}`],
    ['Type', movement.type],
    ['Quantity', movement.quantity],
    ['Status', normalizedStatus],
    ['Admin Notes', reason ? reason : movement.notes?.trim() || '—']
  ];

  const reviewUrl = `${FRONTEND_BASE_URL}/movements`;
  const html = buildTemplate({
    title: `Movement Request ${normalizedStatus}`,
    intro: summary,
    body: `
      ${renderDetailsTable(details)}
      ${renderCTA('View request history', reviewUrl)}
    `
  });

  const text = [
    summary,
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `View details: ${reviewUrl}`
  ].join('\n');

  return sendEmail({
    to: movement.requestedBy.email,
    subject,
    html,
    text
  });
}

function sanitizeBaseUrl(url = '') {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

function parseEmailList(value) {
  if (!value) return [];
  return value.split(',').map((email) => email.trim()).filter(Boolean);
}

function getAdminRecipients() {
  const configured = parseEmailList(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);
  if (configured.length) {
    return configured;
  }
  return ADMIN_RECIPIENT_FALLBACK;
}

function renderDetailsTable(rows = []) {
  if (!rows.length) {
    return '';
  }

  const items = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px;color:#475467;font-size:14px;font-weight:600;width:40%;">${label}</td>
          <td style="padding:6px 12px;color:#101828;font-size:14px;">${value}</td>
        </tr>`
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;background:#f8fafc;border-radius:8px;">
      <tbody>
        ${items}
      </tbody>
    </table>
  `;
}

function renderList(items = []) {
  if (!items.length) {
    return '';
  }

  return `
    <ul style="padding-left:20px;margin:16px 0;color:#101828;font-size:14px;">
      ${items.map((item) => `<li style="margin:4px 0;">${item}</li>`).join('')}
    </ul>
  `;
}

function renderCTA(label, url) {
  if (!url) {
    return '';
  }
  return `
    <div style="margin-top:24px;">
      <a href="${url}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
        ${label}
      </a>
    </div>
  `;
}

function buildTemplate({ title, intro, body }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f5f7;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(15,23,42,0.08);overflow:hidden;">
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 8px;color:#2563eb;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">${APP_NAME}</p>
                  <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">${title}</h1>
                  <p style="margin:0 0 16px;color:#475467;font-size:15px;line-height:1.6;">${intro}</p>
                  ${body}
                  <p style="margin:32px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
                    Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;">${SUPPORT_EMAIL}</a><br />
                    Sent automatically by ${APP_NAME}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

async function logOnlyEmail({ from, to, subject, html, text }) {
  const streamTransporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  const info = await streamTransporter.sendMail({
    from,
    to,
    subject: `${subject} (LOG ONLY - SMTP UNREACHABLE)`,
    text,
    html
  });
  console.log('----- EMAIL (LOG ONLY) -----');
  console.log(info.message.toString());
  console.log('----- END EMAIL -----');
  return { ok: true, messageId: 'log-only', previewUrl: null, logged: info.message.toString() };
}