const STORAGE_KEY = 'customer_device_id';

// Generate a stable, anonymous device id for guest customers
export function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const id = (crypto && crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(STORAGE_KEY, id);
    return id;
}
