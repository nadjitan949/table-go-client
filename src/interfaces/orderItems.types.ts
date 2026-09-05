export interface OrderAddon {
    addonId: number;
    quantity: number;
}

export interface OrderItems {
    menuId: number;
    note: string | "";
    addon: OrderAddon[] | [];
}