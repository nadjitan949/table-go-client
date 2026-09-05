export interface AddOnMenu {
    id: number;
    name: string;
    price: string;
    description: string | null;
    image: string | null;
    menuId: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface AddOnSelection {
    addon: AddOnMenu;
    quantity: number;
}