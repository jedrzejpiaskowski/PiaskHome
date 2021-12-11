export interface VisitEntry {
    id: string;
    patient: string;
    date: Date;
    price: number;
    earnings: number;
    percentage: number;
    comment: number;
    saved: boolean;
}

export interface MonthSummary {
    month: Date;
    days: DaySummary[];
    totalPrice: number;
    totalEarnings: number;
}

export interface DaySummary {
    day: Date;
    visitsCount: number;
    price: number;
    earnings: number;
}