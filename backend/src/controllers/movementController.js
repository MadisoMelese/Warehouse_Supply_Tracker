import prisma from '../utils/prisma.js';

// Record movement in same transaction as stock update
export const createMovement = async (req, res) => {
  const { itemId, type, quantity } = req.body;
  
  // Validate required fields
  if (!itemId || !type || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid payload: itemId, type, and positive quantity are required' });
  }
  
  // Validate movement type
  if (type !== 'INBOUND' && type !== 'OUTBOUND') {
    return res.status(400).json({ error: 'Type must be either INBOUND or OUTBOUND' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: Number(itemId) } });
      if (!item) throw new Error('Item not found');

      const newStock = type === 'INBOUND'
        ? item.currentStock + Number(quantity)
        : item.currentStock - Number(quantity);

      if (newStock < 0) throw new Error('Insufficient stock - would be negative');

      const movement = await tx.movement.create({
        data: { itemId: Number(itemId), type, quantity: Number(quantity) }
      });

      await tx.item.update({
        where: { id: Number(itemId) },
        data: { currentStock: newStock }
      });

      return { movement, newStock };
    });

    res.json({ movement: result.movement, currentStock: result.newStock });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getMovements = async (req, res) => {
  const { itemId, type, from, to } = req.query;
  const where = {};
  if (itemId) where.itemId = Number(itemId);
  if (type) where.type = type;
  if (from || to) where.timestamp = {};
  if (from) where.timestamp.gte = new Date(from);
  if (to) where.timestamp.lte = new Date(to);

  const movements = await prisma.movement.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    include: { item: true }
  });
  res.json(movements);
};