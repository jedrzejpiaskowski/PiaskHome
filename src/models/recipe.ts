import { Ingredient } from "./ingredients";

export interface Recipe {
    id: string;
    creationDate: Date;
    title: string;
    url: string;
    description: string;
    calories: number|null;
    prepTime: number|null;
    tags: string[];
    imageUrls: string[];
    ingredients: Ingredient[];
    saved: boolean;
    rating: number|null;
}

export interface TagContainer {
    tags: string[];
}