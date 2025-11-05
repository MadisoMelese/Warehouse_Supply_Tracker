import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export const checkAndNotifyLowStock = async () => {
  const rows = await prisma.$queryRaw`
    SELECT id, name, "currentStock", "lowStockThreshold"
    FROM "Item"
    WHERE "currentStock" < "lowStockThreshold";
  `;

  if (!rows || rows.length === 0) {
    console.log('No low-stock items.');
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('ADMIN_EMAIL not configured; skipping email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = `<p>Low stock alert:</p><ul>${
    rows.map(r => `<li>${r.name} (stock: ${r.currentStock}, threshold: ${r.lowStockThreshold})</li>`).join('')
  }</ul>`;

  try {
    const info = await transporter.sendMail({
      from: '"Warehouse" <no-reply@warehouse.local>',
      to: adminEmail,
      subject: 'Low stock alert',
      html
    });
    console.log('Low-stock email sent. Preview URL (ethereal):', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Failed to send low-stock email:', err);
  }
};