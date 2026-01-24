import { format, formatDistance, formatRelative } from 'date-fns';

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
}

export function formatDateTime(date: string | Date): string {
    return formatDate(date, 'PPP p');
}

export function formatTimeAgo(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistance(dateObj, new Date(), { addSuffix: true });
}

export function formatCurrency(amount: number, currency: string = 'NPR'): string {
    const formatted = new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    if (currency === 'NPR') {
        return formatted.replace(/^Rs\b/, 'Rs.');
    }

    return formatted;
}

export function formatTokenNumber(token: number | undefined): string {
    if (token === undefined) return 'N/A';
    return String(token).padStart(3, '0');
}

export function formatPhoneNumber(phone: string): string {
    // Basic phone number formatting for Nepal (+977)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return phone;
}
