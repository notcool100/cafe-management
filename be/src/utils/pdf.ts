import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Order, OrderItem, MenuItem, Branch } from '@prisma/client';

export type OrderWithItems = Order & {
    orderItems: (OrderItem & {
        menuItem: MenuItem & { branch?: Branch | null };
    })[];
};

const PT_PER_MM = 72 / 25.4;
const PAPER_WIDTH_MM = 80;
const RECEIPT_WIDTH_PT = PAPER_WIDTH_MM * PT_PER_MM;
const RECEIPT_PAGE_SIZE: [number, number] = [RECEIPT_WIDTH_PT, 200 * PT_PER_MM];
const PAGE_MARGIN = 10;
const CONTENT_LEFT_X = PAGE_MARGIN;
const CONTENT_RIGHT_X = RECEIPT_WIDTH_PT - PAGE_MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT_X - CONTENT_LEFT_X;
const ITEM_COL_WIDTH = CONTENT_WIDTH * 0.46;
const QTY_COL_WIDTH = CONTENT_WIDTH * 0.12;
const PRICE_COL_WIDTH = CONTENT_WIDTH * 0.2;
const TOTAL_COL_WIDTH = CONTENT_WIDTH * 0.22;
const ITEM_COL_X = CONTENT_LEFT_X;
const QTY_COL_X = ITEM_COL_X + ITEM_COL_WIDTH;
const PRICE_COL_X = QTY_COL_X + QTY_COL_WIDTH;
const TOTAL_COL_X = PRICE_COL_X + PRICE_COL_WIDTH;

const LINE_HEIGHT_7 = 9;
const LINE_HEIGHT_8 = 10;
const LINE_HEIGHT_9 = 11;
const LINE_HEIGHT_13 = 16;
const LINE_HEIGHT_18 = 22;
const MIN_PAGE_HEIGHT = 140;
const SAFETY_BUFFER = 28;
const BOLD_FONT_PATH = path.resolve(__dirname, '../../fonts/Roboto-Bold.ttf');

const formatPercentage = (value: number) => {
    if (Number.isInteger(value)) {
        return value.toFixed(0);
    }

    return value.toFixed(2).replace(/\.?0+$/, '');
};

const normalizeCategoryName = (value?: string | null) =>
    (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');

const isToppingCategoryName = (value?: string | null) => {
    const normalized = normalizeCategoryName(value);

    return [
        'topping',
        'toppings',
        'addon',
        'addons',
        'add on',
        'add ons',
        'extra',
        'extras',
    ].includes(normalized);
};

const formatReceiptItemName = (item: OrderWithItems['orderItems'][number]) => {
    const name = item.menuItem?.name || 'Item';

    if (!isToppingCategoryName(item.menuItem?.category)) {
        return name;
    }

    return `+ ${name} (Topping)`;
};

const estimateReceiptHeight = (order: OrderWithItems, titleSize = 13) => {
    let height = 0;

    height += titleSize >= 18 ? LINE_HEIGHT_18 : titleSize >= 13 ? LINE_HEIGHT_13 : LINE_HEIGHT_9;
    height += 8; // spacing after title

    if (order.tokenNumber) {
        height += LINE_HEIGHT_18 + 8;
    }

    let infoLines = 2; // Order ID + Date
    if (order.customerName) infoLines += 1;
    if (order.customerPhone) infoLines += 1;
    height += infoLines * LINE_HEIGHT_8 + 8;

    height += 8; // separator + spacing

    height += LINE_HEIGHT_8 + 6; // header + spacing
    height += 6; // separator + spacing

    order.orderItems.forEach((item) => {
        height += LINE_HEIGHT_8 + 4;
        if (item.menuItem.branchId !== order.branchId) {
            height += LINE_HEIGHT_7 + 4;
        }
    });

    height += 8; // separator + spacing
    const hasDiscount = Number(order.discountAmount || 0) > 0;
    height += (hasDiscount ? LINE_HEIGHT_8 * 2 + LINE_HEIGHT_9 : LINE_HEIGHT_9) + 10;
    height += LINE_HEIGHT_8 + 12; // thank you
    height += 8; // bottom padding

    return Math.max(MIN_PAGE_HEIGHT, height + PAGE_MARGIN * 2 + SAFETY_BUFFER);
};

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
        doc.text(formatReceiptItemName(item), ITEM_COL_X, rowY, { width: ITEM_COL_WIDTH });
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

    const boldFont = fs.existsSync(BOLD_FONT_PATH) ? BOLD_FONT_PATH : 'Helvetica-Bold';
    const subtotalAmount = Number(order.subtotalAmount || order.totalAmount || 0);
    const discountAmount = Number(order.discountAmount || 0);
    const discountPercentage = Number(order.discountPercentage || 0);
    const hasDiscount = discountAmount > 0;

    doc.font('Helvetica').fontSize(8);

    if (hasDiscount) {
        const subtotalY = doc.y;
        doc.text('Subtotal:', PRICE_COL_X, subtotalY, { width: PRICE_COL_WIDTH, align: 'right' });
        doc.text(`${subtotalAmount.toFixed(2)}`, TOTAL_COL_X, subtotalY, {
            width: TOTAL_COL_WIDTH,
            align: 'right',
        });

        doc.moveDown(0.4);
        const discountY = doc.y;
        doc.text(`Discount (${formatPercentage(discountPercentage)}%):`, PRICE_COL_X, discountY, {
            width: PRICE_COL_WIDTH,
            align: 'right',
        });
        doc.text(`- ${discountAmount.toFixed(2)}`, TOTAL_COL_X, discountY, {
            width: TOTAL_COL_WIDTH,
            align: 'right',
        });

        doc.moveDown(0.6);
    }

    doc.fontSize(9);
    const totalY = doc.y;
    doc.font(boldFont).text(hasDiscount ? 'Net Total:' : 'Total:', PRICE_COL_X, totalY, {
        width: PRICE_COL_WIDTH,
        align: 'right',
    });
    doc.text(`${Number(order.totalAmount || 0).toFixed(2)}`, TOTAL_COL_X, totalY, {
        width: TOTAL_COL_WIDTH,
        align: 'right',
    });

    doc.moveDown(1);
    doc.font('Helvetica');
    doc.fontSize(8).text('Thank you for your order!', CONTENT_LEFT_X, doc.y, { width: CONTENT_WIDTH, align: 'center' });
};

export async function generateKOT(order: OrderWithItems): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: [RECEIPT_WIDTH_PT, estimateReceiptHeight(order, 13)],
            margin: PAGE_MARGIN,
        });
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
        const doc = new PDFDocument({
            size: [RECEIPT_WIDTH_PT, estimateReceiptHeight(order, 13)],
            margin: PAGE_MARGIN,
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        renderReceiptSection(doc, order, 'BILL');

        doc.end();
    });
}
