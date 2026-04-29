import { resolveUploadsBase } from '../api/base-url';

export const resolveImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return undefined;
    if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }

    const normalized = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const uploadsBase = resolveUploadsBase();

    if (normalized.startsWith('/uploads/')) {
        return `${uploadsBase}${normalized.slice('/uploads'.length)}`;
    }

    return normalized;
};
