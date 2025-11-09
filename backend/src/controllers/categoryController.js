import prisma from '../utils/prisma.js';

/**
 * Create a new category - Admin only
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get all categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

/**
 * Get a single category by ID
 */
export const getCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            status: true,
            currentStock: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

/**
 * Update a category - Admin only
 */
export const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (name.trim() === '') {
        return res.status(400).json({ error: 'Category name cannot be empty' });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData
    });

    res.json(category);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Delete a category - Admin only
 * Only allowed if no items are associated with it
 */
export const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Check if category has items
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category._count.items > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with associated items. Please reassign items first.'
      });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(400).json({ error: err.message });
  }
};

