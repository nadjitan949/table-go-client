export interface OrderAddon {
    addonId: number;
    quantity: number;
}

export interface OrderItems {
    menuId: number;
    status: "pending" | "is_cooking" | "ready" | "taked" | "livred"
    note: string | "";
    addon: OrderAddon[] | [];
}