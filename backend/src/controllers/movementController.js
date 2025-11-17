import prisma from '../utils/prisma.js';
import { notifyAdmins, notifyUser } from '../utils/socket.js';
import { sendMovementRequestEmail, sendMovementStatusEmail } from '../utils/mailer.js';

/**
 * Request a movement (inbound/outbound) - Users can request, requires admin approval
 */
export const requestMovement = async (req, res) => {
  try {
    const { itemId, type, quantity, notes } = req.body;
    const userId = req.user.sub;

    // Validate required fields
    if (!itemId || !type || !quantity || quantity <= 0) {
      return res.status(400).json({
        error: 'Invalid payload: itemId, type, and positive quantity are required'
      });
    }

    // Validate movement type
    if (type !== 'INBOUND' && type !== 'OUTBOUND') {
      return res.status(400).json({ error: 'Type must be either INBOUND or OUTBOUND' });
    }

    // Check if item exists
    const item = await prisma.item.findUnique({ where: { id: Number(itemId) } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // For outbound, check if sufficient stock is available
    if (type === 'OUTBOUND' && item.currentStock < quantity) {
      return res.status(400).json({
        error: `Insufficient stock. Available: ${item.currentStock}, Requested: ${quantity}`
      });
    }

    // Create movement request with PENDING status
    const movement = await prisma.movement.create({
      data: {
        itemId: Number(itemId),
        type,
        quantity: Number(quantity),
        status: 'PENDING',
        requestedById: userId,
        notes: notes?.trim() || null
      },
      include: {
        item: {
          include: {
            category: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Emit real-time notification to admins
    notifyAdmins('movement_request', {
      type: 'movement_request',
      title: 'New Movement Request',
      message: `${movement.requestedBy.email} requested ${movement.type.toLowerCase()} of ${movement.quantity} ${movement.item.name}`,
      movementId: movement.id,
      itemName: movement.item.name,
      type: movement.type,
      quantity: movement.quantity,
      requestedBy: movement.requestedBy.email,
      itemId: movement.itemId
    });

    try {
      await sendMovementRequestEmail({ movement });
    } catch (emailErr) {
      console.error('Failed to send movement request email:', emailErr);
    }

    res.status(201).json({
      message: 'Movement request created. Waiting for admin approval.',
      movement
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Approve a movement request - Admin only
 * This will update the stock and item status
 */
export const approveMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.sub;

    const movement = await prisma.movement.findUnique({
      where: { id: Number(id) },
      include: { item: true }
    });

    if (!movement) {
      return res.status(404).json({ error: 'Movement not found' });
    }

    if (movement.status !== 'PENDING') {
      return res.status(400).json({
        error: `Movement is already ${movement.status.toLowerCase()}`
      });
    }

    // Process the movement in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Calculate new stock
      const newStock =
        movement.type === 'INBOUND'
          ? movement.item.currentStock + movement.quantity
          : movement.item.currentStock - movement.quantity;

      if (newStock < 0) {
        throw new Error('Insufficient stock - would be negative');
      }

      // Update movement status and approve
      const updatedMovement = await tx.movement.update({
        where: { id: Number(id) },
        data: {
          status: 'APPROVED',
          approvedById: adminId
        },
        include: {
          item: true,
          requestedBy: {
            select: { id: true, email: true }
          },
          approvedBy: {
            select: { id: true, email: true }
          }
        }
      });

      // Update item stock
      const updateData = { currentStock: newStock };

      // For outbound movements, mark item as ISSUED if stock becomes 0
      if (movement.type === 'OUTBOUND' && newStock === 0) {
        updateData.status = 'ISSUED';
      } else if (movement.type === 'INBOUND' && movement.item.status === 'ISSUED' && newStock > 0) {
        // If inbound and item was issued, mark as available
        updateData.status = 'AVAILABLE';
      }

      await tx.item.update({
        where: { id: movement.itemId },
        data: updateData
      });

      return { movement: updatedMovement, newStock };
    });

    // Notify the user who requested the movement
    notifyUser(result.movement.requestedById, 'movement_approved', {
      type: 'movement_approved',
      title: 'Movement Request Approved',
      message: `Your ${result.movement.type.toLowerCase()} request for ${result.movement.quantity} ${result.movement.item.name} has been approved`,
      movementId: result.movement.id,
      itemName: result.movement.item.name,
      movementType: result.movement.type,
      quantity: result.movement.quantity
    });

    try {
      await sendMovementStatusEmail({ movement: result.movement, status: 'APPROVED' });
    } catch (emailErr) {
      console.error('Failed to send movement approval email:', emailErr);
    }

    res.json({
      message: 'Movement approved and stock updated',
      movement: result.movement,
      currentStock: result.newStock
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Reject a movement request - Admin only
 */
export const rejectMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.sub;

    const movement = await prisma.movement.findUnique({
      where: { id: Number(id) },
      include: {
        item: true,
        requestedBy: {
          select: { id: true, email: true }
        }
      }
    });

    if (!movement) {
      return res.status(404).json({ error: 'Movement not found' });
    }

    if (movement.status !== 'PENDING') {
      return res.status(400).json({
        error: `Movement is already ${movement.status.toLowerCase()}`
      });
    }

    const updatedMovement = await prisma.movement.update({
      where: { id: Number(id) },
      data: {
        status: 'REJECTED',
        approvedById: adminId,
        notes: reason
          ? `${movement.notes || ''}\n[Rejection reason: ${reason}]`.trim()
          : movement.notes
      },
      include: {
        item: true,
        requestedBy: {
          select: { id: true, email: true }
        },
        approvedBy: {
          select: { id: true, email: true }
        }
      }
    });

    // Notify the user who requested the movement
    notifyUser(updatedMovement.requestedById, 'movement_rejected', {
      type: 'movement_rejected',
      title: 'Movement Request Rejected',
      message: `Your ${updatedMovement.type.toLowerCase()} request for ${updatedMovement.quantity} ${updatedMovement.item.name} has been rejected${reason ? `: ${reason}` : ''}`,
      movementId: updatedMovement.id,
      itemName: updatedMovement.item.name,
      movementType: updatedMovement.type,
      quantity: updatedMovement.quantity,
      reason: reason || null
    });

    try {
      await sendMovementStatusEmail({
        movement: updatedMovement,
        status: 'REJECTED',
        reason
      });
    } catch (emailErr) {
      console.error('Failed to send movement rejection email:', emailErr);
    }

    res.json({
      message: 'Movement rejected',
      movement: updatedMovement
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Return an item - Mark outbound movement as returned
 */
export const returnItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const movement = await prisma.movement.findUnique({
      where: { id: Number(id) },
      include: { item: true }
    });

    if (!movement) {
      return res.status(404).json({ error: 'Movement not found' });
    }

    if (movement.type !== 'OUTBOUND') {
      return res.status(400).json({ error: 'Can only return outbound movements' });
    }

    if (movement.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Can only return approved movements'
      });
    }

    if (movement.isReturned) {
      return res.status(400).json({ error: 'Item already returned' });
    }

    // Only the requester or admin can return
    if (movement.requestedById !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'You can only return items you requested'
      });
    }

    // Process return in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark movement as returned
      const updatedMovement = await tx.movement.update({
        where: { id: Number(id) },
        data: {
          isReturned: true,
          returnedAt: new Date()
        },
        include: {
          item: true,
          requestedBy: {
            select: { id: true, email: true }
          }
        }
      });

      // Update item stock (add back the quantity)
      const newStock = movement.item.currentStock + movement.quantity;

      // Update item status to AVAILABLE if it was ISSUED
      const updateData = {
        currentStock: newStock,
        status: 'AVAILABLE'
      };

      await tx.item.update({
        where: { id: movement.itemId },
        data: updateData
      });

      return { movement: updatedMovement, newStock };
    });

    res.json({
      message: 'Item returned successfully',
      movement: result.movement,
      currentStock: result.newStock
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get movements with filters
 * Users can only see their own movements, admins can see all
 */
export const getMovements = async (req, res) => {
  try {
    const { itemId, type, status, from, to, userId, isReturned } = req.query;
    const where = {};

    // Users can only see their own movements, admins can see all
    if (req.user.role !== 'ADMIN') {
      where.requestedById = req.user.sub;
    } else if (userId) {
      where.requestedById = Number(userId);
    }

    if (itemId) where.itemId = Number(itemId);
    if (type && ['INBOUND', 'OUTBOUND'].includes(type)) where.type = type;
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    if (isReturned !== undefined) {
      where.isReturned = isReturned === 'true';
    }
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const movements = await prisma.movement.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        item: {
          include: {
            category: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
};

/**
 * Get a single movement by ID
 */
export const getMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const movement = await prisma.movement.findUnique({
      where: { id: Number(id) },
      include: {
        item: {
          include: {
            category: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!movement) {
      return res.status(404).json({ error: 'Movement not found' });
    }

    // Users can only see their own movements
    if (req.user.role !== 'ADMIN' && movement.requestedById !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(movement);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movement' });
  }
};