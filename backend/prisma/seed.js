const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', password: hashed, role: 'admin' }
  });

  await prisma.item.createMany({
    data: [
      { name: 'Laptop', sku: 'LAP001', supplier: 'TechCorp', initialQuantity: 20, currentStock: 20, lowStockThreshold: 5 },
      { name: 'Mouse', sku: 'MOU001', supplier: 'Peripherals Inc', initialQuantity: 50, currentStock: 50, lowStockThreshold: 10 },
      { name: 'Keyboard', sku: 'KEY001', supplier: 'Peripherals Inc', initialQuantity: 30, currentStock: 30, lowStockThreshold: 8 }
    ],
    skipDuplicates: true
  });

  console.log('Seed completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
