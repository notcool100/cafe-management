import PDFDocument from 'pdfkit';
import { Order, OrderItem, MenuItem } from '@prisma/client';

export type OrderWithItems = Order & {
    orderItems: (OrderItem & {
        menuItem: MenuItem;
    })[];
};

export async function generateKOT(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('KITCHEN ORDER TICKET (KOT)', { align: 'center' });
        doc.moveDown();

        // Token Number
        if (order.tokenNumber) {
            doc
                .fontSize(16)
                .text(`Token #${order.tokenNumber}`, { align: 'center' });
            doc.moveDown();
        }

        // Order Details
        doc.fontSize(12);
        doc.text(`Order ID: ${order.id}`);
        doc.text(`Date: ${order.createdAt.toLocaleString()}`);
        if (order.customerName) {
            doc.text(`Customer: ${order.customerName}`);
        }
        doc.moveDown();

        // Items
        doc.fontSize(14).text('Items:', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(11);
        order.orderItems.forEach((item, index) => {
            doc.text(
                `${index + 1}. ${item.menuItem.name} x ${item.quantity}`,
                { indent: 20 }
            );
        });

        doc.moveDown();
        doc.fontSize(10).text(`Status: ${order.status}`, { align: 'right' });

        doc.end();
    });
}

export async function generateBill(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(24).text('BILL', { align: 'center' });
        doc.moveDown();

        // Token Number
        if (order.tokenNumber) {
            doc
                .fontSize(18)
                .text(`Token #${order.tokenNumber}`, { align: 'center' });
            doc.moveDown();
        }

        // Order Details
        doc.fontSize(12);
        doc.text(`Order ID: ${order.id}`);
        doc.text(`Date: ${order.createdAt.toLocaleString()}`);
        if (order.customerName) {
            doc.text(`Customer: ${order.customerName}`);
        }
        if (order.customerPhone) {
            doc.text(`Phone: ${order.customerPhone}`);
        }
        doc.moveDown();

        // Line separator
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Items Header
        doc.fontSize(11);
        doc.text('Item', 50, doc.y, { width: 250, continued: true });
        doc.text('Qty', 300, doc.y, { width: 50, continued: true });
        doc.text('Price', 350, doc.y, { width: 100, continued: true });
        doc.text('Total', 450, doc.y, { width: 100, align: 'right' });
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Items
        order.orderItems.forEach((item) => {
            const itemTotal = Number(item.price) * item.quantity;
            doc.text(item.menuItem.name, 50, doc.y, { width: 250, continued: true });
            doc.text(item.quantity.toString(), 300, doc.y, {
                width: 50,
                continued: true,
            });
            doc.text(`$${Number(item.price).toFixed(2)}`, 350, doc.y, {
                width: 100,
                continued: true,
            });
            doc.text(`$${itemTotal.toFixed(2)}`, 450, doc.y, {
                width: 100,
                align: 'right',
            });
            doc.moveDown();
        });

        // Line separator
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Total
        doc.fontSize(14);
        doc.text('Total Amount:', 350, doc.y, { continued: true });
        doc.text(`$${Number(order.totalAmount).toFixed(2)}`, 450, doc.y, {
            width: 100,
            align: 'right',
        });

        doc.moveDown(2);
        doc.fontSize(10).text('Thank you for your order!', { align: 'center' });

        doc.end();
    });
}
