import { PrismaClient } from '@prisma/client';
import { generateBranchQR } from './src/utils/qrcode';
import dotenv from 'dotenv';

// Load environment variables if running locally
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Starting QR code regeneration...');
    
    // Get the frontend URL from environment, or fallback
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!frontendUrl) {
        console.error('ERROR: FRONTEND_URL environment variable is not set!');
        console.log('Please set it in your .env file or environment before running this script.');
        process.exit(1);
    }
    
    console.log(`Using FRONTEND_URL: ${frontendUrl}`);

    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
        });

        console.log(`Found ${branches.length} active branches to update.`);

        let successCount = 0;
        let errorCount = 0;

        for (const branch of branches) {
            try {
                const newQrCode = await generateBranchQR(branch.id, frontendUrl);
                
                await prisma.branch.update({
                    where: { id: branch.id },
                    data: { qrCode: newQrCode },
                });
                
                console.log(`✅ Updated QR code for branch: ${branch.name} (${branch.id})`);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to update branch ${branch.name} (${branch.id}):`, err);
                errorCount++;
            }
        }

        console.log('\n--- Summary ---');
        console.log(`Successfully updated: ${successCount}`);
        console.log(`Failed to update: ${errorCount}`);
        
    } catch (error) {
        console.error('Error connecting to the database or fetching branches:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
