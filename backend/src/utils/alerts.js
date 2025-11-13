import prisma from './prisma.js';
import nodemailer from 'nodemailer';
import { notifyAdmins } from './socket.js';

export const checkAndNotifyLowStock = async () => {
  // 1) Find low stock items (stock <= threshold)
  const rows = await prisma.$queryRaw`
    SELECT id, name, "currentStock", "lowStockThreshold"
    FROM "Item"
    WHERE "currentStock" <= "lowStockThreshold";
  `;

  if (!rows || rows.length === 0) {
    console.log('No low-stock items.');
    return;
  }

  // 2) Resolve email transport
  let smtpUser = process.env.SMTP_USER;
  let smtpPass = process.env.SMTP_PASS;
  let smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let smtpPort = Number(process.env.SMTP_PORT || 587);

  // Create an ethereal test account automatically if credentials are not provided
  if (!smtpUser || !smtpPass) {
    console.log('SMTP credentials not provided. Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    smtpUser = testAccount.user;
    smtpPass = testAccount.pass;
    smtpHost = testAccount.smtp.host;
    smtpPort = testAccount.smtp.port;
    console.log('Ethereal test account created. Emails will not be delivered to real inbox.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS || 8000)
  });

  // 3) Resolve admin recipient (fallback to smtp user in test mode)
  const adminEmail = process.env.ADMIN_EMAIL || smtpUser;

  const html = `<p>Low stock alert:</p><ul>${
    rows.map(r => `<li>${r.name} (stock: ${r.currentStock}, threshold: ${r.lowStockThreshold})</li>`).join('')
  }</ul>`;

  // Always send real-time notification to admins (regardless of email status)
  notifyAdmins('low_stock_alert', {
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: `${rows.length} item(s) are running low on stock`,
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      currentStock: r.currentStock,
      threshold: r.lowStockThreshold
    }))
  });

  try {
    const mail = {
      from: '"Warehouse" <no-reply@warehouse.local>',
      to: adminEmail,
      subject: 'Low stock alert',
      html
    };

    const info = await transporter.sendMail(mail);
    console.log('Low-stock email sent. Preview URL (ethereal):', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    // Fallback: no outbound SMTP connectivity → log the email content locally
    if (['ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED'].includes(err?.code)) {
      try {
        console.warn('SMTP not reachable. Falling back to local stream transport (log-only).');
        const streamTransporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        const info = await streamTransporter.sendMail({
          from: '"Warehouse" <no-reply@warehouse.local>',
          to: adminEmail,
          subject: 'Low stock alert (LOG ONLY - SMTP UNREACHABLE)',
          html
        });
        console.log('----- LOW STOCK ALERT (LOG ONLY) -----');
        console.log(info.message.toString());
        console.log('----- END ALERT -----');
      } catch (fallbackErr) {
        console.error('Fallback log-only transport failed:', fallbackErr);
      }
    } else {
      console.error('Failed to send low-stock email:', err);
    }
  }
};