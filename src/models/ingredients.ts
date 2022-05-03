export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    categoryId: string;
}

export interface IngredientContainer {
    ingredients: Ingredient[];
}

export interface ProductCategory {
    id: string;
    name: string;
    order: number;
}