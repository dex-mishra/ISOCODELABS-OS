import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const resourcesCount = await prisma.exploreResource.count();
    console.log('ExploreResource count:', resourcesCount);
  } catch (e) {
    console.error('Error checking tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
