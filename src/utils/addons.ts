import type { AddOnMenu, AddOnSelection } from "../interfaces/addon.types";

export function formatPrice(price: string | number): string {
    return `${Math.round(Number(price)).toLocaleString("fr-FR")} FCFA`;
}

export function getAddonQuantity(
    selection: AddOnSelection[],
    addonId: number
): number {
    return selection.find((s) => s.addon.id === addonId)?.quantity ?? 0;
}

export function setAddonQuantity(
    selection: AddOnSelection[],
    addon: AddOnMenu,
    quantity: number
): AddOnSelection[] {
    if (quantity <= 0) {
        return selection.filter((s) => s.addon.id !== addon.id);
    }
    const index = selection.findIndex((s) => s.addon.id === addon.id);
    if (index === -1) {
        return [...selection, { addon, quantity }];
    }
    return selection.map((s) =>
        s.addon.id === addon.id ? { ...s, quantity } : s
    );
}

export function addonsSubtotal(selection: AddOnSelection[]): number {
    return selection.reduce(
        (sum, s) => sum + Number(s.addon.price) * s.quantity,
        0
    );
}