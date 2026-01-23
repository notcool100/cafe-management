import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('🌱 Starting database seed...');

    // Clean existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.tenant.deleteMany();

    console.log('🧭 Creating plans...');
    const starterPlan = await prisma.plan.create({
        data: {
            slug: 'starter',
            name: 'Starter',
            branchesLimit: 1,
            seatsLimit: 5,
            menuItemsLimit: 50,
        },
    });

    const growthPlan = await prisma.plan.create({
        data: {
            slug: 'growth',
            name: 'Growth',
            branchesLimit: 5,
            seatsLimit: 30,
            menuItemsLimit: 500,
        },
    });

    console.log('🏢 Creating tenant & subscription...');
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Demo Cafe Group',
            slug: 'demo-cafe-group',
            planId: growthPlan.id,
        },
    });

    await prisma.subscription.create({
        data: {
            tenantId: tenant.id,
            planId: growthPlan.id,
            status: 'ACTIVE',
            startedAt: new Date(),
        },
    });

    console.log('✨ Creating branches...');
    const mainBranch = await prisma.branch.create({
        data: {
            name: 'Main Branch',
            location: 'Downtown, Kathmandu',
            hasTokenSystem: true,
            maxTokenNumber: 50,
            currentToken: 1,
            tenantId: tenant.id,
        },
    });

    const suburbanBranch = await prisma.branch.create({
        data: {
            name: 'Suburban Branch',
            location: 'Thamel, Kathmandu',
            hasTokenSystem: true,
            maxTokenNumber: 30,
            currentToken: 1,
            tenantId: tenant.id,
        },
    });

    console.log(`✅ Created ${mainBranch.name} and ${suburbanBranch.name}`);

    // Create users
    console.log('👥 Creating users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);

    await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@cafe.com',
            password: adminPassword,
            role: 'ADMIN',
            tenantId: tenant.id,
        },
    });

    await prisma.user.create({
        data: {
            name: 'Manager - Main',
            email: 'manager1@cafe.com',
            password: managerPassword,
            role: 'MANAGER',
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
    });

    await prisma.user.create({
        data: {
            name: 'Manager - Suburban',
            email: 'manager2@cafe.com',
            password: managerPassword,
            role: 'MANAGER',
            branchId: suburbanBranch.id,
            tenantId: tenant.id,
        },
    });

    console.log(`✅ Created admin and 2 managers`);
    console.log(`   📧 Admin: admin@cafe.com / admin123`);
    console.log(`   📧 Manager 1: manager1@cafe.com / manager123`);
    console.log(`   📧 Manager 2: manager2@cafe.com / manager123`);

    // Create menu items
    console.log('🍽️  Creating menu items...');

    const menuItems = [
        // Food items
        {
            name: 'Chicken Burger',
            description: 'Grilled chicken patty with lettuce, tomato, and special sauce',
            price: 350,
            category: 'FOOD',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Vegetable Pizza',
            description: 'Fresh vegetables on a thin crust with mozzarella cheese',
            price: 650,
            category: 'FOOD',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Chicken Momo',
            description: 'Steamed dumplings with spicy chicken filling (10 pieces)',
            price: 180,
            category: 'FOOD',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'French Fries',
            description: 'Crispy golden fries with ketchup',
            price: 120,
            category: 'FOOD',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Chicken Sandwich',
            description: 'Grilled chicken with fresh veggies in whole wheat bread',
            price: 280,
            category: 'FOOD',
            isAvailable: true,
            branchId: suburbanBranch.id,
            tenantId: tenant.id,
        },
        // Beverages
        {
            name: 'Cappuccino',
            description: 'Rich espresso with steamed milk and foam',
            price: 180,
            category: 'BEVERAGE',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Latte',
            description: 'Smooth espresso with steamed milk',
            price: 200,
            category: 'BEVERAGE',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Fresh Orange Juice',
            description: 'Freshly squeezed orange juice',
            price: 150,
            category: 'BEVERAGE',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Iced Coffee',
            description: 'Cold brew coffee with ice',
            price: 220,
            category: 'BEVERAGE',
            isAvailable: true,
            branchId: suburbanBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Masala Tea',
            description: 'Traditional Nepali spiced tea',
            price: 60,
            category: 'BEVERAGE',
            isAvailable: true,
            branchId: suburbanBranch.id,
            tenantId: tenant.id,
        },
        // Desserts
        {
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake with chocolate ganache',
            price: 250,
            category: 'DESSERT',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Ice Cream Sundae',
            description: 'Vanilla ice cream with chocolate syrup and nuts',
            price: 200,
            category: 'DESSERT',
            isAvailable: true,
            branchId: mainBranch.id,
            tenantId: tenant.id,
        },
        {
            name: 'Apple Pie',
            description: 'Warm apple pie with cinnamon',
            price: 220,
            category: 'DESSERT',
            isAvailable: true,
            branchId: suburbanBranch.id,
            tenantId: tenant.id,
        },
    ];

    for (const item of menuItems) {
        await prisma.menuItem.create({ data: item });
    }

    console.log(`✅ Created ${menuItems.length} menu items`);

    // Create sample orders
    console.log('📦 Creating sample orders...');

    await prisma.order.create({
        data: {
            branchId: mainBranch.id,
            tenantId: tenant.id,
            tokenNumber: 1,
            status: 'COMPLETED',
            totalAmount: 530,
            completedAt: new Date(),
            orderItems: {
                create: [
                    {
                        menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Chicken Burger' } }))!.id,
                        quantity: 1,
                        price: 350,
                    },
                    {
                        menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Cappuccino' } }))!.id,
                        quantity: 1,
                        price: 180,
                    },
                ],
            },
        },
    });

    await prisma.order.create({
        data: {
            branchId: mainBranch.id,
            tenantId: tenant.id,
            tokenNumber: 2,
            status: 'CANCELLATION_PENDING',
            cancellationRequestedAt: new Date(),
            cancellationExpiresAt: new Date(Date.now() + 60_000),
            cancellationPreviousStatus: 'PREPARING',
            totalAmount: 830,
            orderItems: {
                create: [
                    {
                        menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Vegetable Pizza' } }))!.id,
                        quantity: 1,
                        price: 650,
                    },
                    {
                        menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Chicken Momo' } }))!.id,
                        quantity: 1,
                        price: 180,
                    },
                ],
            },
        },
    });

    console.log(`✅ Created 2 sample orders`);

    // Update current token for main branch
    await prisma.branch.update({
        where: { id: mainBranch.id },
        data: { currentToken: 3 },
    });

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • 2 Plans created`);
    console.log(`   • 1 Tenant with active subscription`);
    console.log(`   • 2 Branches created`);
    console.log(`   • 3 Users created (1 admin, 2 managers)`);
    console.log(`   • ${menuItems.length} Menu items created`);
    console.log(`   • 2 Sample orders created`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Admin:  admin@cafe.com  / admin123`);
    console.log(`   Manager1: manager1@cafe.com / manager123`);
    console.log(`   Manager2: manager2@cafe.com / manager123`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
