import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminHashed = await bcrypt.hash('AdminPass123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminHashed,
      role: 'ADMIN'
    }
  });

  // Create regular user
  const userHashed = await bcrypt.hash('UserPass123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userHashed,
      role: 'USER'
    }
  });

  // Create categories
  const electronicsCategory = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Electronic devices and components'
    }
  });

  const peripheralsCategory = await prisma.category.upsert({
    where: { name: 'Peripherals' },
    update: {},
    create: {
      name: 'Peripherals',
      description: 'Computer peripherals and accessories'
    }
  });

  // Create items
  await prisma.item.upsert({
    where: { sku: 'LAP001' },
    update: {},
    create: {
      name: 'Laptop Dell XPS 15',
      sku: 'LAP001',
      barcode: 'BCLAP001001',
      supplier: 'TechCorp',
      categoryId: electronicsCategory.id,
      initialQuantity: 20,
      currentStock: 20,
      lowStockThreshold: 5,
      status: 'AVAILABLE'
    }
  });

  await prisma.item.upsert({
    where: { sku: 'MOU001' },
    update: {},
    create: {
      name: 'Wireless Mouse',
      sku: 'MOU001',
      barcode: 'BCMOU001001',
      supplier: 'Peripherals Inc',
      categoryId: peripheralsCategory.id,
      initialQuantity: 50,
      currentStock: 50,
      lowStockThreshold: 10,
      status: 'AVAILABLE'
    }
  });

  await prisma.item.upsert({
    where: { sku: 'KEY001' },
    update: {},
    create: {
      name: 'Mechanical Keyboard',
      sku: 'KEY001',
      barcode: 'BCKEY001001',
      supplier: 'Peripherals Inc',
      categoryId: peripheralsCategory.id,
      initialQuantity: 30,
      currentStock: 30,
      lowStockThreshold: 8,
      status: 'AVAILABLE'
    }
  });

  console.log('Seed completed successfully!');
  console.log('Admin user: admin@example.com / AdminPass123!');
  console.log('Regular user: user@example.com / UserPass123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
