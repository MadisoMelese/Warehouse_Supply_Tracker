import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const applyTriggers = async () => {
  const sqlPath = path.join(__dirname, '..', 'prisma', 'triggers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Triggers applied successfully.');
  await prisma.$disconnect();
};

applyTriggers().catch(err => {
  console.error('Failed to apply triggers:', err);
  process.exit(1);
});