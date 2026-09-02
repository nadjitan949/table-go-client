export interface Table {
    id: number;
    number: string;
    qrCodeToken: string;
    qrCodeImageUrl: string | null;
    status: "free" | "occupied" | "out_of_service";
    createdAt: string;
    updatedAt: string;
}