import { Ingredient } from "./ingredients";

export interface Recipe {
    id: string;
    creationDate: Date;
    title: string;
    url: string;
    description: string;
    tags: string[];
    imageUrls: string[];
    ingredients: Ingredient[];
    saved: boolean;
}

export interface TagContainer {
    tags: string[];
}