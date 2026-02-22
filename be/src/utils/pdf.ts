import PDFDocument from 'pdfkit';
import { Order, OrderItem, MenuItem, Branch } from '@prisma/client';

export type OrderWithItems = Order & {
    orderItems: (OrderItem & {
        menuItem: MenuItem & { branch?: Branch | null };
    })[];
};

const PT_PER_MM = 72 / 25.4;
const PAPER_WIDTH_MM = 80;
const PAPER_HEIGHT_MM = 265; // 26.5 cm
const RECEIPT_PAGE_SIZE: [number, number] = [PAPER_WIDTH_MM * PT_PER_MM, PAPER_HEIGHT_MM * PT_PER_MM];
const PAGE_MARGIN = 10;
const CONTENT_LEFT_X = PAGE_MARGIN;
const CONTENT_RIGHT_X = RECEIPT_PAGE_SIZE[0] - PAGE_MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT_X - CONTENT_LEFT_X;
const ITEM_COL_WIDTH = CONTENT_WIDTH * 0.46;
const QTY_COL_WIDTH = CONTENT_WIDTH * 0.12;
const PRICE_COL_WIDTH = CONTENT_WIDTH * 0.2;
const TOTAL_COL_WIDTH = CONTENT_WIDTH * 0.22;
const ITEM_COL_X = CONTENT_LEFT_X;
const QTY_COL_X = ITEM_COL_X + ITEM_COL_WIDTH;
const PRICE_COL_X = QTY_COL_X + QTY_COL_WIDTH;
const TOTAL_COL_X = PRICE_COL_X + PRICE_COL_WIDTH;

export async function generateKOT(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: RECEIPT_PAGE_SIZE, margin: PAGE_MARGIN });
        const buffers: Buffer[] = [];
// doc.registerFont('Regular', 'fonts/Roboto-Regular.ttf');
// doc.registerFont('Bold', '');
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header (use bill layout but keep KOT title)
        doc.fontSize(11).text('KITCHEN ORDER TICKET (KOT)', { align: 'center' });
        doc.moveDown();

        // Token Number
        if (order.tokenNumber) {
            doc
                .fontSize(18)
                .text(`Token #${order.tokenNumber}`, { align: 'center' });
            doc.moveDown();
        }

        // Order Details
        doc.fontSize(8);
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
        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown();

        // Items Header
        doc.fontSize(8);
        const headerY = doc.y;
        doc.text('Item', ITEM_COL_X, headerY, { width: ITEM_COL_WIDTH });
        doc.text('Qty', QTY_COL_X, headerY, { width: QTY_COL_WIDTH, align: 'center' });
        doc.text('Price', PRICE_COL_X, headerY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text('Total', TOTAL_COL_X, headerY, { width: TOTAL_COL_WIDTH, align: 'right' });
        doc.moveDown();

        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown(0.5);

        // Items
        order.orderItems.forEach((item) => {
            const itemTotal = Number(item.price) * item.quantity;
            const rowY = doc.y;
            doc.text(item.menuItem.name, ITEM_COL_X, rowY, { width: ITEM_COL_WIDTH });
            doc.text(item.quantity.toString(), QTY_COL_X, rowY, { width: QTY_COL_WIDTH, align: 'center' });
            doc.text(`${Number(item.price).toFixed(2)}`, PRICE_COL_X, rowY, { width: PRICE_COL_WIDTH, align: 'right' });
            doc.text(`${itemTotal.toFixed(2)}`, TOTAL_COL_X, rowY, { width: TOTAL_COL_WIDTH, align: 'right' });
            doc.moveDown(0.5);

            if (item.menuItem.branchId !== order.branchId) {
                const sharedBranchName = item.menuItem.branch?.name;
                const noteText = sharedBranchName
                    ? `From another branch: ${sharedBranchName}`
                    : 'From another branch';
                doc.fontSize(7);
                doc.text(noteText, ITEM_COL_X, doc.y, { width: ITEM_COL_WIDTH });
                doc.fontSize(8);
                doc.moveDown(0.4);
            }
        });

        // Line separator
        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown();

        // Total (if available)
        doc.fontSize(9);
        const totalY = doc.y;
        doc.font('fonts/Roboto-Bold.ttf').text('Total:', PRICE_COL_X, totalY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text(`${Number(order.totalAmount || 0).toFixed(2)}`, TOTAL_COL_X, totalY, {
            width: TOTAL_COL_WIDTH,
            align: 'right',
        });

        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for your order!', { align: 'center' });

        doc.end();
    });
}

export async function generateBill(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: RECEIPT_PAGE_SIZE, margin: PAGE_MARGIN });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(13).text('BILL', { align: 'center' });
        doc.moveDown();

        // Token Number
        if (order.tokenNumber) {
            doc
                .fontSize(18)
                .text(`Token #${order.tokenNumber}`, { align: 'center' });
            doc.moveDown();
        }

        // Order Details
        doc.fontSize(8);
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
        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown();

        // Items Header
        doc.fontSize(8);
        const billHeaderY = doc.y;
        doc.text('Item', ITEM_COL_X, billHeaderY, { width: ITEM_COL_WIDTH });
        doc.text('Qty', QTY_COL_X, billHeaderY, { width: QTY_COL_WIDTH, align: 'center' });
        doc.text('Price', PRICE_COL_X, billHeaderY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text('Total', TOTAL_COL_X, billHeaderY, { width: TOTAL_COL_WIDTH, align: 'right' });
        doc.moveDown();

        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown(0.5);

        // Items
        order.orderItems.forEach((item) => {
            const itemTotal = Number(item.price) * item.quantity;
            const billRowY = doc.y;
            doc.text(item.menuItem.name, ITEM_COL_X, billRowY, { width: ITEM_COL_WIDTH });
            doc.text(item.quantity.toString(), QTY_COL_X, billRowY, { width: QTY_COL_WIDTH, align: 'center' });
            doc.text(`${Number(item.price).toFixed(2)}`, PRICE_COL_X, billRowY, { width: PRICE_COL_WIDTH, align: 'right' });
            doc.text(`${itemTotal.toFixed(2)}`, TOTAL_COL_X, billRowY, { width: TOTAL_COL_WIDTH, align: 'right' });
            doc.moveDown(0.5);

            if (item.menuItem.branchId !== order.branchId) {
                const sharedBranchName = item.menuItem.branch?.name;
                const noteText = sharedBranchName
                    ? `From another branch: ${sharedBranchName}`
                    : 'From another branch';
                doc.fontSize(7);
                doc.text(noteText, ITEM_COL_X, doc.y, { width: ITEM_COL_WIDTH });
                doc.fontSize(8);
                doc.moveDown(0.4);
            }
        });

        // Line separator
        doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
        doc.moveDown();

        // Total
        doc.fontSize(9);
        const billTotalY = doc.y;
        doc.font('fonts/Roboto-Bold.ttf').text('Total:', PRICE_COL_X, billTotalY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text(`${Number(order.totalAmount).toFixed(2)}`, TOTAL_COL_X, billTotalY, {
            width: TOTAL_COL_WIDTH,
            align: 'right',
        });

        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for your order!', { align: 'center' });

        doc.end();
    });
}
