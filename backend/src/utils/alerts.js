import prisma from './prisma.js';
import { notifyAdmins } from './socket.js';
import { sendLowStockAlertEmail } from './mailer.js';

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
    await sendLowStockAlertEmail(rows);
  } catch (err) {
    console.error('Failed to send low-stock email notification:', err);
  }
};