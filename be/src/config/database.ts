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

const assertSafeDatabaseTarget = (url?: string) => {
    if (!url || process.env.NODE_ENV === 'production') {
        return;
    }

    if (process.env.ALLOW_LIVE_DATABASE_IN_DEV === 'true') {
        return;
    }

    try {
        const parsed = new URL(url);
        const databaseName = parsed.pathname.replace(/^\/+/, '').toLowerCase();
        const looksLikeLiveDatabase =
            databaseName.includes('live') || databaseName.includes('prod') || databaseName.includes('production');

        if (looksLikeLiveDatabase) {
            throw new Error(
                `Refusing to connect to database "${databaseName}" while NODE_ENV=${process.env.NODE_ENV}. ` +
                'Use a dev/staging database instead, or set ALLOW_LIVE_DATABASE_IN_DEV=true to override.'
            );
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
    }
};

assertSafeDatabaseTarget(databaseUrl);

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

