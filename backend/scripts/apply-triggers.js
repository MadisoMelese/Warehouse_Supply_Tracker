const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function applyTriggers() {
  const sqlPath = path.join(__dirname, '..', 'prisma', 'triggers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Triggers applied successfully.');
  await prisma.$disconnect();
}

applyTriggers().catch(err => {
  console.error('Failed to apply triggers:', err);
  process.exit(1);
});
