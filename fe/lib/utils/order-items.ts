import { OrderItem } from '../types';
import { isToppingCategoryName } from './topping';

export const isToppingOrderItem = (item?: Pick<OrderItem, 'menuItem'> | null) =>
    isToppingCategoryName(item?.menuItem?.category);

export const formatOrderItemName = (
    item?: Pick<OrderItem, 'menuItem'> | null,
    options?: { prefixTopping?: boolean }
) => {
    const name = item?.menuItem?.name || 'Item';

    if (!isToppingOrderItem(item)) {
        return name;
    }

    const prefix = options?.prefixTopping ? '+ ' : '';
    return `${prefix}${name} (Topping)`;
};
