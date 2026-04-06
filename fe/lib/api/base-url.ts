const DEFAULT_API_PATH = '/api';
const DEFAULT_UPLOADS_PATH = '/uploads';

const trimTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

const normalizeConfiguredBase = (value?: string | null) => {
    const configured = value?.trim();
    if (!configured) {
        return DEFAULT_API_PATH;
    }

    if (/^https?:\/\//i.test(configured)) {
        const clean = trimTrailingSlash(configured);
        return clean.endsWith('/api') ? clean : `${clean}/api`;
    }

    const clean = configured.startsWith('/') ? configured : `/${configured}`;
    return clean.endsWith('/api') ? clean : `${trimTrailingSlash(clean)}/api`;
};

export const API_BASE_URL = normalizeConfiguredBase(process.env.NEXT_PUBLIC_API_URL);

export const getApiOrigin = () => {
    if (/^https?:\/\//i.test(API_BASE_URL)) {
        return API_BASE_URL.replace(/\/api$/, '');
    }

    return '';
};

export const resolveUploadsBase = () => {
    const origin = getApiOrigin();
    return origin ? `${origin}${DEFAULT_UPLOADS_PATH}` : DEFAULT_UPLOADS_PATH;
};
