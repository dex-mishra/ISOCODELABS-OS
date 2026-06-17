const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to connect to the database...');
  try {
    const users = await prisma.user.findMany();
    console.log('Connection successful! Found users:', users.length);
  } catch (error) {
    console.error('Connection failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
