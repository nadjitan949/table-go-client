import type { Order } from "../interfaces/order.types";
import type { OrderItems } from "../interfaces/orderItems.types";

export const ORDER_STORAGE_KEY = "Order";

interface LegacyOrderItem extends OrderItems {
    locked?: boolean;
}

interface LegacyOrder {
    id?: string;
    tableToken?: string;
    createdAt?: number;
    locked?: boolean;
    order?: Array<OrderItems | LegacyOrderItem>;
}

export function createOrderId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalise une commande (gère l'ancien format où chaque item avait un champ `locked`). */
function normalizeOrder(order: LegacyOrder): Order {
    const rawItems = Array.isArray(order?.order) ? order.order : [];
    const items: OrderItems[] = rawItems.map((it) => {
        const rest = { ...(it ?? {}) as LegacyOrderItem };
        delete rest.locked; // Supprime proprement la propriété sans créer de variable inutilisée
        return {
            menuId: Number(rest.menuId) || 0,
            note: rest.note ?? "",
            addon: Array.isArray(rest.addon) ? rest.addon : [],
            status: rest.status ?? "pending",
        };
    });

    const itemsAllLocked =
        items.length > 0 && rawItems.every((it) => (it as LegacyOrderItem).locked === true);

    return {
        id: order?.id || createOrderId(),
        tableToken: order?.tableToken ?? "",
        order: items,
        locked: order?.locked === undefined ? itemsAllLocked : Boolean(order.locked),
        createdAt: order?.createdAt ?? Date.now(),
    };
}


export function readOrders(): Order[] {
    try {
        const raw = localStorage.getItem(ORDER_STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
            return parsed
                .filter((o): o is LegacyOrder => Boolean(o && typeof o === "object"))
                .map((o) => normalizeOrder(o));
        }

        if (parsed && typeof parsed === "object" && "order" in parsed) {
            return [normalizeOrder(parsed as LegacyOrder)];
        }

        return [];
    } catch {
        return [];
    }
}

export function writeOrders(orders: Order[]): void {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event("orderUpdated"));
}

export function readOrderById(orderId: string | undefined): Order | null {
    if (!orderId) return null;
    return readOrders().find((o) => o.id === orderId) ?? null;
}

export function writeOrderById(updated: Order): void {
    const orders = readOrders();
    const idx = orders.findIndex((o) => o.id === updated.id);
    if (idx === -1) {
        writeOrders([...orders, updated]);
        return;
    }
    const next = [...orders];
    next[idx] = updated;
    writeOrders(next);
}

/** Retourne le brouillon (commande non envoyée) le plus récent d'une table, s'il existe. */
export function findActiveOrder(orders: Order[], tableToken?: string): Order | null {
    const candidates = tableToken
        ? orders.filter((o) => o.tableToken === tableToken)
        : orders;
    return candidates.find((o) => !o.locked) ?? null;
}