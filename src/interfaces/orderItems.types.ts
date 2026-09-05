import type { AddOnMenu } from "./addon.types";

export interface OrderItems {
    menuId: number,
    note: string | "",
    addon: AddOnMenu[] | []
}