const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export const resolveImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return undefined;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    if (imageUrl.startsWith('/')) {
        return `${API_BASE_URL}${imageUrl}`;
    }
    return `${API_BASE_URL}/${imageUrl}`;
};
