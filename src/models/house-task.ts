export interface HouseTasks {
    id: string;
    date: Date;
    dateString: string;
    who: string;
    dinner: boolean;
    snacks: boolean;
    dishesAndKitchen: boolean;
    dishwasher: boolean;
    groceries: boolean;
    vacuuming: boolean;
    dusting: boolean;
    smallBathroom: boolean;
    bigBathroom: boolean;
    laundry: boolean;
    approved: boolean|null;
    saved: boolean;
}

export enum HouseTasksLabels {
    // kitchen
    Dinner = 'Obiad',
    Snacks = 'Przekąski',
    DishesAndKitchen = 'Naczynia',
    Dishwasher = 'Zmywarka',
    Groceries = 'Zakupy',
    // cleaning
    Vacuuming = 'Odkurzanie',
    Dusting = 'Kurze',
    SmallBathroom = 'M. łazienka',
    BigBathroom = 'D. łazienka',
    Laundry = 'Pranie'
}