import type { ReceivedGood } from '../types';

export interface StockAlertInfo {
    id: string;
    name: string;
    category: string;
    makeModel: string;
    supplier: string;
    quantity: number;
    initialQuantity: number;
    thresholdPercent: number; // 0 - 100
    thresholdQty: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    percentRemaining: number;
}

export const DEFAULT_THRESHOLD_PERCENT = 20;

export const getInitialQuantity = (item: ReceivedGood): number => {
    if (typeof item.initialQuantity === 'number' && item.initialQuantity > 0) {
        return item.initialQuantity;
    }
    const serialCount = Array.isArray(item.serials) ? item.serials.length : 0;
    return Math.max(item.quantity || 0, serialCount, 1);
};

export const getItemStockAlertInfo = (
    item: ReceivedGood,
    overrides?: Record<string, number>
): StockAlertInfo => {
    const initialQty = getInitialQuantity(item);

    let thresholdPercent = DEFAULT_THRESHOLD_PERCENT;
    if (overrides && typeof overrides[item.id] === 'number') {
        thresholdPercent = overrides[item.id];
    } else if (typeof item.lowStockThresholdPercent === 'number') {
        thresholdPercent = item.lowStockThresholdPercent;
    }

    thresholdPercent = Math.max(0, Math.min(100, thresholdPercent));

    const thresholdQty = Math.round((initialQty * thresholdPercent) / 100);
    const currQty = Math.max(0, item.quantity || 0);

    const isOutOfStock = currQty === 0;
    const isLowStock = currQty <= thresholdQty;
    const percentRemaining = initialQty > 0 ? Math.min(100, Math.round((currQty / initialQty) * 100)) : 0;

    return {
        id: item.id,
        name: item.name || 'Unnamed Item',
        category: item.category || 'General',
        makeModel: item.makeModel || '',
        supplier: item.supplier || '',
        quantity: currQty,
        initialQuantity: initialQty,
        thresholdPercent,
        thresholdQty,
        isLowStock,
        isOutOfStock,
        percentRemaining
    };
};

export const getLowStockAlerts = (
    items: ReceivedGood[],
    overrides?: Record<string, number>
): StockAlertInfo[] => {
    return (items || [])
        .map(item => getItemStockAlertInfo(item, overrides))
        .filter(info => info.isLowStock)
        .sort((a, b) => a.percentRemaining - b.percentRemaining);
};
