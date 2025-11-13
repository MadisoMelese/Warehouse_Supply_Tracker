import prisma from '../utils/prisma.js';
import { randomBytes } from 'crypto';

/**
 * Generate a unique barcode
 */
const generateBarcode = () => {
  return 'BC' + randomBytes(8).toString('hex').toUpperCase();
};

/**
 * Create a new item - Admin only
 */
export const createItem = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      supplier,
      categoryId,
      initialQuantity = 0,
      lowStockThreshold = 5,
      status = 'AVAILABLE'
    } = req.body;

    // Validate required fields
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    // Validate category exists
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Validate initialQuantity is non-negative
    if (initialQuantity < 0) {
      return res.status(400).json({ error: 'Initial quantity must be non-negative' });
    }

    // Validate lowStockThreshold is non-negative
    if (lowStockThreshold < 0) {
      return res.status(400).json({ error: 'Low stock threshold must be non-negative' });
    }

    // Validate status
    if (status && !['AVAILABLE', 'ISSUED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either AVAILABLE or ISSUED' });
    }

    // Generate barcode if not provided
    let itemBarcode = barcode;
    if (!itemBarcode) {
      itemBarcode = generateBarcode();
      // Ensure uniqueness
      let exists = true;
      while (exists) {
        const existing = await prisma.item.findUnique({ where: { barcode: itemBarcode } });
        if (!existing) exists = false;
        else itemBarcode = generateBarcode();
      }
    }

    const item = await prisma.item.create({
      data: {
        name,
        sku,
        barcode: itemBarcode,
        supplier,
        categoryId: Number(categoryId),
        initialQuantity,
        currentStock: initialQuantity,
        lowStockThreshold,
        status
      },
      include: {
        category: true
      }
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0];
      return res.status(409).json({ error: `${field === 'sku' ? 'SKU' : 'Barcode'} already exists` });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get all items with optional filters
 */
export const getItems = async (req, res) => {
  try {
    const { status, categoryId, search } = req.query;
    const where = {};

    if (status && ['AVAILABLE', 'ISSUED'].includes(status)) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

/**
 * Get item by ID or barcode
 */
export const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(id);

    const item = await prisma.item.findUnique({
      where: isNumeric ? { id: Number(id) } : { barcode: id },
      include: {
        category: true,
        movements: {
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            requestedBy: {
              select: { id: true, email: true }
            },
            approvedBy: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

/**
 * Update an item - Admin only
 */
export const updateItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, sku, barcode, supplier, categoryId, lowStockThreshold, status } = req.body;

    // Check if item exists
    const existing = await prisma.item.findUnique({
      where: { id },
      include: { movements: { take: 1 } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (lowStockThreshold !== undefined) {
      if (lowStockThreshold < 0) {
        return res.status(400).json({ error: 'Low stock threshold must be non-negative' });
      }
      updateData.lowStockThreshold = lowStockThreshold;
    }

    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      updateData.categoryId = Number(categoryId);
    }

    if (status !== undefined) {
      if (!['AVAILABLE', 'ISSUED'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either AVAILABLE or ISSUED' });
      }
      updateData.status = status;
    }

    // Only allow initialQuantity update if no movements exist
    if (req.body.initialQuantity !== undefined) {
      if (existing.movements.length > 0) {
        return res.status(400).json({
          error: 'Cannot update initialQuantity after movements have been recorded'
        });
      }
      if (req.body.initialQuantity < 0) {
        return res.status(400).json({ error: 'Initial quantity must be non-negative' });
      }
      updateData.initialQuantity = req.body.initialQuantity;
      updateData.currentStock = req.body.initialQuantity;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    res.json(item);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0];
      return res.status(409).json({ error: `${field === 'sku' ? 'SKU' : 'Barcode'} already exists` });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Update stock directly - Admin only
 * Creates an automatic movement record for audit purposes
 */
export const updateStock = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newStock, reason } = req.body;
    const adminId = req.user.sub;

    if (newStock === undefined || newStock < 0) {
      return res.status(400).json({ error: 'Valid newStock (>= 0) is required' });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const stockDifference = Number(newStock) - item.currentStock;

    // Update stock and create movement record in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update item stock
      const updateData = { currentStock: Number(newStock) };

      // Update status based on new stock
      if (Number(newStock) === 0) {
        updateData.status = 'ISSUED';
      } else if (item.status === 'ISSUED' && Number(newStock) > 0) {
        updateData.status = 'AVAILABLE';
      }

      const updatedItem = await tx.item.update({
        where: { id },
        data: updateData,
        include: {
          category: true
        }
      });

      // Create movement record for audit trail
      if (stockDifference !== 0) {
        await tx.movement.create({
          data: {
            itemId: id,
            type: stockDifference > 0 ? 'INBOUND' : 'OUTBOUND',
            quantity: Math.abs(stockDifference),
            status: 'APPROVED',
            requestedById: adminId,
            approvedById: adminId,
            notes: reason || `Admin stock adjustment: ${stockDifference > 0 ? '+' : ''}${stockDifference}`
          }
        });
      }

      return updatedItem;
    });

    res.json({
      message: 'Stock updated successfully',
      item: result,
      previousStock: item.currentStock,
      newStock: Number(newStock),
      difference: stockDifference
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Delete an item - Admin only
 */
export const deleteItem = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.item.delete({ where: { id } });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(400).json({ error: err.message });
  }
};