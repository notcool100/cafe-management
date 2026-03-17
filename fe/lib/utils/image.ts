const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export const resolveImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return undefined;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    try {
        // Remove /api if present for images as they are served from root /uploads
        const cleanBase = API_BASE_URL.endsWith('/api')
            ? API_BASE_URL.slice(0, -4)
            : (API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL);

        const baseOrigin = new URL(cleanBase).origin;
        const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        return `${baseOrigin}${normalized}`;
    } catch {
        // Fallback for relative paths
        const cleanBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
        const divider = (cleanBase.endsWith('/') || imageUrl.startsWith('/')) ? '' : '/';
        return `${cleanBase}${divider}${imageUrl}`;
    }
};
