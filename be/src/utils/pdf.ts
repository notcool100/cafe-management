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
const SECTION_MIN_HEIGHT = 140;

const renderReceiptSection = (
    doc: PDFKit.PDFDocument,
    order: OrderWithItems,
    title: string,
    titleSize = 13
) => {
    doc.x = CONTENT_LEFT_X;
    doc.fontSize(titleSize).text(title, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown();

    if (order.tokenNumber) {
        doc.fontSize(18).text(`Token #${order.tokenNumber}`, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH, align: 'center' });
        doc.moveDown();
    }

    doc.fontSize(8);
    doc.text(`Order ID: ${order.id}`, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH });
    doc.text(`Date: ${order.createdAt.toLocaleString()}`, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH });
    if (order.customerName) {
        doc.text(`Customer: ${order.customerName}`, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH });
    }
    if (order.customerPhone) {
        doc.text(`Phone: ${order.customerPhone}`, CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH });
    }
    doc.moveDown();

    doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(8);
    const headerY = doc.y;
    doc.text('Item', ITEM_COL_X, headerY, { width: ITEM_COL_WIDTH });
    doc.text('Qty', QTY_COL_X, headerY, { width: QTY_COL_WIDTH, align: 'center' });
    doc.text('Price', PRICE_COL_X, headerY, { width: PRICE_COL_WIDTH, align: 'right' });
    doc.text('Total', TOTAL_COL_X, headerY, { width: TOTAL_COL_WIDTH, align: 'right' });
    doc.moveDown();

    doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
    doc.moveDown(0.5);

    order.orderItems.forEach((item) => {
        const itemTotal = Number(item.price) * item.quantity;
        const rowY = doc.y;
        doc.text(item.menuItem.name, ITEM_COL_X, rowY, { width: ITEM_COL_WIDTH });
        doc.text(item.quantity.toString(), QTY_COL_X, rowY, { width: QTY_COL_WIDTH, align: 'center' });
        doc.text(`${Number(item.price).toFixed(2)}`, PRICE_COL_X, rowY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text(`${itemTotal.toFixed(2)}`, TOTAL_COL_X, rowY, { width: TOTAL_COL_WIDTH, align: 'right' });
        doc.moveDown(0.5);

        if (item.menuItem.branchId !== order.branchId) {
            const sourceBranchName = item.menuItem.branch?.name || item.menuItem.branchId;
            const noteText = `From branch: ${sourceBranchName}`;
            doc.fontSize(7);
            doc.text(noteText, ITEM_COL_X, doc.y, { width: ITEM_COL_WIDTH });
            doc.fontSize(8);
            doc.moveDown(0.4);
        }
    });

    doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(9);
    const totalY = doc.y;
    doc.font('fonts/Roboto-Bold.ttf').text('Total:', PRICE_COL_X, totalY, { width: PRICE_COL_WIDTH, align: 'right' });
    doc.text(`${Number(order.totalAmount || 0).toFixed(2)}`, TOTAL_COL_X, totalY, {
        width: TOTAL_COL_WIDTH,
        align: 'right',
    });

    doc.moveDown(2);
    doc.fontSize(8).text('Thank you for your order!', CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH, align: 'center' });
};

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

        renderReceiptSection(doc, order, 'KOT');

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

        renderReceiptSection(doc, order, 'BILL');

        if (doc.y + SECTION_MIN_HEIGHT > RECEIPT_PAGE_SIZE[1] - PAGE_MARGIN) {
            doc.addPage();
        } else {
            doc.moveDown(1.2);
            doc.moveTo(CONTENT_LEFT_X, doc.y).lineTo(CONTENT_RIGHT_X, doc.y).stroke();
            doc.moveDown(1);
        }

        renderReceiptSection(doc, order, 'KOT');

        doc.end();
    });
}
