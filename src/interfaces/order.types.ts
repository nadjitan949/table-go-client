import type { OrderItems } from "./orderItems.types";

export interface Order {
    /** Identifiant unique de la commande */
    id: string;
    /** Token de la table à laquelle appartient la commande */
    tableToken: string;
    /** Articles composant la commande */
    order: OrderItems[];
    /** true = commande envoyée/validée, false = brouillon en cours */
    locked?: boolean;
    /** Horodatage de création (ms) pour l'affichage / le tri */
    createdAt?: number;
}