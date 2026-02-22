const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export const resolveImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return undefined;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    try {
        const baseOrigin = new URL(API_BASE_URL).origin;
        const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        return `${baseOrigin}${normalized}`;
    } catch {
        if (imageUrl.startsWith('/')) {
            return `${API_BASE_URL}${imageUrl}`;
        }
        return `${API_BASE_URL}/${imageUrl}`;
    }
};
