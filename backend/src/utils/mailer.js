import nodemailer from 'nodemailer';

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

export async function sendEmail({ to, subject, html, text, from = '"Warehouse" <no-reply@warehouse.local>' }) {
  let transporter;
  try {
    transporter = await getTransporter();
  } catch (err) {
    console.warn('Failed to create SMTP transporter, using log-only fallback:', err.message);
    // Fallback to log-only if transporter creation fails
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

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log('Email sent. Preview URL:', preview);
    }
    return { ok: true, messageId: info.messageId, previewUrl: preview || null };
  } catch (err) {
    // Fallback to log-only if SMTP is unreachable
    if (['ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EAUTH', 'EENVELOPE'].includes(err?.code)) {
      console.warn('SMTP not reachable. Falling back to local stream transport (log-only).');
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
    throw err;
  }
}


