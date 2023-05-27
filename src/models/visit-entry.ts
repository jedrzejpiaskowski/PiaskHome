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
    month: number;
    monthDate: Date;
    days: DaySummary[];
    totalPrice: number;
    totalEarnings: number;
    visitsCount: number;
}

export interface DaySummary {
    day: Date;
    visitsCount: number;
    price: number;
    earnings: number;
}

export interface Summary {
    totalEarnings: number;
    totalPrice: number;
    totalVisits: number;
}