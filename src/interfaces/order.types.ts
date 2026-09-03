import type { OrderItems } from "./orderItems.types";

export interface Order {
    tableToken: string,
    order: OrderItems[]
}