import { PrismaClient } from '@prisma/client';

const withConnectionLimit = (url?: string) => {
    if (!url || url.includes('connection_limit=')) {
        return url;
    }

    try {
        const parsed = new URL(url);
        parsed.searchParams.set('connection_limit', '1');
        return parsed.toString();
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}connection_limit=1`;
    }
};

const databaseUrl = withConnectionLimit(process.env.DATABASE_URL);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prisma =
    globalForPrisma.prisma ??
    (databaseUrl
        ? new PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
            log: ['query', 'error', 'warn'],
        })
        : new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };
export default prisma;

