import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createItem = async (req, res) => {
  try {
    const { name, sku, supplier, initialQuantity = 0, lowStockThreshold = 5 } = req.body;
    const item = await prisma.item.create({
      data: { name, sku, supplier, initialQuantity, currentStock: initialQuantity, lowStockThreshold }
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getItems = async (req, res) => {
  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } });
  res.json(items);
};

export const getItem = async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
};