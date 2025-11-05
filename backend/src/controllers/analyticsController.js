import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const stockPerItem = async (req, res) => {
  const items = await prisma.item.findMany({
    select: { id: true, name: true, currentStock: true, lowStockThreshold: true }
  });
  res.json(items);
};

export const movementsTrend = async (req, res) => {
  const raw = await prisma.$queryRaw`
    SELECT date_trunc('day', "timestamp")::date AS day,
           sum(CASE WHEN type='INBOUND' THEN quantity ELSE 0 END) AS inbound,
           sum(CASE WHEN type='OUTBOUND' THEN quantity ELSE 0 END) AS outbound
    FROM "Movement"
    GROUP BY day
    ORDER BY day;
  `;
  res.json(raw);
};