import { PrismaClient } from '@prisma/client';

// Singleton pattern for PrismaClient to avoid connection pool exhaustion
const prisma = new PrismaClient();

export default prisma;

