import type { AddOnMenu } from "./addon.types";

export type MenuCategory = "starter" | "main" | "dessert" | "drink";

export interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: string;
    category: MenuCategory;
    estimatedPrepTime: number;
    isAvailable: boolean;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    AddOns?: AddOnMenu[];
}