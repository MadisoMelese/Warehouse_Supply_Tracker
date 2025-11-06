import prisma from '../utils/prisma.js';

export const createItem = async (req, res) => {
  try {
    const { name, sku, supplier, initialQuantity = 0, lowStockThreshold = 5 } = req.body;
    
    // Validate required fields
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }
    
    // Validate initialQuantity is non-negative
    if (initialQuantity < 0) {
      return res.status(400).json({ error: 'Initial quantity must be non-negative' });
    }
    
    // Validate lowStockThreshold is non-negative
    if (lowStockThreshold < 0) {
      return res.status(400).json({ error: 'Low stock threshold must be non-negative' });
    }
    
    const item = await prisma.item.create({
      data: { name, sku, supplier, initialQuantity, currentStock: initialQuantity, lowStockThreshold }
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
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

export const updateItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, sku, supplier, lowStockThreshold } = req.body;
    
    // Check if item exists
    const existing = await prisma.item.findUnique({ 
      where: { id },
      include: { movements: { take: 1 } }
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    
    // Don't allow updating initialQuantity if movements exist (data integrity)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = lowStockThreshold;
    
    // Only allow initialQuantity update if no movements exist
    if (req.body.initialQuantity !== undefined) {
      if (existing.movements.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot update initialQuantity after movements have been recorded' 
        });
      }
      updateData.initialQuantity = req.body.initialQuantity;
      updateData.currentStock = req.body.initialQuantity; // Reset currentStock too
    }
    
    const item = await prisma.item.update({ where: { id }, data: updateData });
    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Item not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
    res.status(400).json({ error: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.item.delete({ where: { id } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(400).json({ error: err.message });
  }
};