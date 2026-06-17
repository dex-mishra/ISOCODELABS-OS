import { PrismaClient } from '@prisma/client';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  cachedDbUrl: string | undefined;
};

function getPrismaClient(): PrismaClient {
  const currentUrl = process.env.DATABASE_URL;
  
  // Re-instantiate if no client exists, or if DATABASE_URL has changed
  if (!globalForPrisma.prisma || globalForPrisma.cachedDbUrl !== currentUrl) {
    if (globalForPrisma.prisma) {
      console.log('🔄 DATABASE_URL changed. Disconnecting old client...');
      globalForPrisma.prisma.$disconnect().catch(() => {});
    }
    
    console.log('🔌 Instantiating new PrismaClient...');
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    globalForPrisma.cachedDbUrl = currentUrl;
  }
  
  return globalForPrisma.prisma;
}

// Export a Proxy wrapper that dynamically resolves to the active PrismaClient instance.
// This prevents connection caching issues across hot-reloads and environment changes.
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const activeClient = getPrismaClient();
    const value = Reflect.get(activeClient, prop, receiver);
    
    // Bind functions to the active client instance to preserve context
    return typeof value === 'function' ? value.bind(activeClient) : value;
  }
});
