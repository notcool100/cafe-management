export const normalizeCategoryName = (value?: string) =>
    (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');

export const isToppingCategoryName = (value?: string) => {
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
