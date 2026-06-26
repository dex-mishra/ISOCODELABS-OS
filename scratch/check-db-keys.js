const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.setting.findMany();
  console.log("Settings keys and values in DB:");
  for (const s of settings) {
    if (s.key.includes('key') || s.key.includes('api')) {
      console.log(`- ${s.key}: ${s.value ? s.value.substring(0, 15) + '...' : 'null'}`);
    } else {
      console.log(`- ${s.key}: ${s.value}`);
    }
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
