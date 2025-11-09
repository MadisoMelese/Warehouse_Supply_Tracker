import prisma from '../utils/prisma.js';

/**
 * Get all item assignments - Admin only
 * Shows who took which items and their return status
 */
export const getItemAssignments = async (req, res) => {
  try {
    const { userId, itemId, isReturned, status } = req.query;
    const where = {
      type: 'OUTBOUND',
      status: 'APPROVED'
    };

    if (userId) {
      where.requestedById = Number(userId);
    }

    if (itemId) {
      where.itemId = Number(itemId);
    }

    if (isReturned !== undefined) {
      where.isReturned = isReturned === 'true';
    }

    if (status) {
      where.item = { status };
    }

    const movements = await prisma.movement.findMany({
      where,
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
            email: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Format response for better readability
    const assignments = movements.map(movement => ({
      id: movement.id,
      item: {
        id: movement.item.id,
        name: movement.item.name,
        sku: movement.item.sku,
        barcode: movement.item.barcode,
        category: movement.item.category.name,
        status: movement.item.status
      },
      quantity: movement.quantity,
      requestedBy: movement.requestedBy,
      approvedBy: movement.approvedBy,
      isReturned: movement.isReturned,
      returnedAt: movement.returnedAt,
      timestamp: movement.timestamp,
      approvedAt: movement.updatedAt
    }));

    res.json({
      total: assignments.length,
      assignments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item assignments' });
  }
};

/**
 * Get user activity summary - Admin only
 * Shows summary of all users' item requests and returns
 */
export const getUserActivitySummary = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        requestedMovements: {
          where: {
            type: 'OUTBOUND'
          },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                barcode: true
              }
            }
          }
        }
      }
    });

    const summary = users.map(user => {
      const outboundMovements = user.requestedMovements;
      const approved = outboundMovements.filter(m => m.status === 'APPROVED');
      const pending = outboundMovements.filter(m => m.status === 'PENDING');
      const rejected = outboundMovements.filter(m => m.status === 'REJECTED');
      const returned = approved.filter(m => m.isReturned);
      const notReturned = approved.filter(m => !m.isReturned);

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        stats: {
          totalRequests: outboundMovements.length,
          approved: approved.length,
          pending: pending.length,
          rejected: rejected.length,
          returned: returned.length,
          notReturned: notReturned.length
        },
        currentItems: notReturned.map(m => ({
          movementId: m.id,
          item: m.item,
          quantity: m.quantity,
          takenAt: m.timestamp
        }))
      };
    });

    res.json({
      totalUsers: summary.length,
      users: summary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user activity summary' });
  }
};

/**
 * Get pending movement requests - Admin only
 */
export const getPendingRequests = async (req, res) => {
  try {
    const movements = await prisma.movement.findMany({
      where: {
        status: 'PENDING'
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
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json({
      total: movements.length,
      requests: movements
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};

