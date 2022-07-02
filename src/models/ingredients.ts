export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number|null;
  categoryId: string;
  addedToList: boolean | null;
}

export interface IngredientContainer {
  ingredients: Ingredient[];
}

export interface ShoppingListContainer {
    items: ShoppingItem[];
  }

export interface ShoppingItem {
  id: string;
  ingredient: Ingredient;
  bought: boolean;
}
export interface ProductCategory {
  id: string;
  name: string;
  order: number;
  icon: string;
}

export const units = [null, 'szt', 'g', 'opak', 'l'];
export enum ShoppingMode {
  View = 'view',
  Edit = 'edit',
}
