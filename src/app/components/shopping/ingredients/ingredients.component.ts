import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {
  FormControl,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import { StringUtilityService } from 'src/app/services/string-utility.service';
import { CollectionKey } from 'src/models/colletion-keys';
import { Constants } from 'src/models/constants';
import {
  Ingredient,
  IngredientContainer,
  ProductCategory,
  ShoppingItem,
  ShoppingListContainer,
  ShoppingMode,
  units,
} from 'src/models/ingredients';

@Component({
  selector: 'app-ingredients',
  templateUrl: './ingredients.component.html',
  styleUrls: ['./ingredients.component.scss'],
})
export class IngredientsComponent implements OnChanges {
  @Input() mode: string = ShoppingMode.View;
  @Input() shoppingList: ShoppingListContainer | null = null;

  categories$: Observable<ProductCategory[]>;
  categories: string[] = [];
  productSearch = new FormControl('');
  productInputs: { [category: string]: string } = {};
  quantityInputs: { [category: string]: number | null } = {};
  unitInputs: { [category: string]: string | null } = {};
  ingredients: { [category: string]: Ingredient[] } = {};
  filteredIngredients: { [category: string]: Ingredient[] } = {};
  ingredientContainer$: Observable<IngredientContainer | undefined>;
  units = units;
  IngredientsKey = CollectionKey.Ingredients;
  searchForm: UntypedFormGroup;

  constructor(
    private store: AngularFirestore,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private stringService: StringUtilityService
  ) {
    this.categories$ = this.store
      .collection<ProductCategory>(CollectionKey.ProductCategories, (ref) =>
        ref.orderBy('order')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        tap((categories) => {
          categories.map((c) => {
            this.productInputs[c.id] = '';
            this.quantityInputs[c.id] = null;
            this.unitInputs[c.id] = null;
          });
        })
      );

    this.searchForm = new UntypedFormGroup({
      ingredientSearch: new UntypedFormControl(''),
    });

    this.ingredientContainer$ = this.store
      .doc<IngredientContainer>(
        `${CollectionKey.ShoppingList}/${Constants.INGREDIENTS_CONTAINER_ID}`
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        tap((ingC) => {
          this.ingredients = {};
          this.categories = [];
          if (ingC && ingC.ingredients?.length > 0) {
            ingC.ingredients.forEach((i) => {
              if (!this.ingredients[i.categoryId]) {
                this.ingredients[i.categoryId] = [];
                this.categories.push(i.categoryId);
              }
              this.ingredients[i.categoryId].push(i);
              this.categories.forEach((c) => {
                this.ingredients[c].sort((a, b) =>
                  a.name.localeCompare(b.name)
                );
              });
            });
            this.filteredIngredients = this.ingredients;
          }
        })
      );

    this.productSearch.valueChanges
      .pipe(
        debounceTime(400),
        tap((filterInput) => {
          if (!filterInput || filterInput === '') {
            this.filteredIngredients = this.ingredients;
            return;
          }
          const filNormalized = stringService
            .deaccent(filterInput)
            .toLowerCase();
          this.filteredIngredients = {};
          this.categories.forEach((c) => {
            this.ingredients[c].forEach((ing) => {
              if (
                stringService
                  .deaccent(ing.name)
                  .toLowerCase()
                  .includes(filNormalized)
              ) {
                if (!this.filteredIngredients[c]) {
                  this.filteredIngredients[c] = [];
                }
                this.filteredIngredients[c].push(ing);
              }
            });
          });
        })
      )
      .subscribe();
  }

  clearFilter() {
    this.productSearch.reset();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.clearSelection();
    }
  }

  deleteIngredient(
    ingredient: Ingredient,
    ingredientContainer: IngredientContainer | null = null
  ) {
    if (!ingredientContainer) return;

    const ingId = ingredientContainer.ingredients.findIndex(
      (i) => i.name === ingredient.name && i.categoryId === i.categoryId
    );
    if (ingId === -1) return;

    const confirmationDialogRef = this.dialog.open(
      ConfirmationDialogComponent,
      {
        data: 'Czy na pewno chcesz usunąć produkt?',
      }
    );
    confirmationDialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        ingredientContainer.ingredients.splice(ingId, 1);
        this.store
          .collection(CollectionKey.ShoppingList)
          .doc(Constants.INGREDIENTS_CONTAINER_ID)
          .update(ingredientContainer);
      }
    });
  }

  addToShoppingList(ingredient: Ingredient) {
    if (!this.shoppingList) return;

    const dupItemIndex = this.shoppingList?.items.findIndex(
      (i) => i.ingredient.id === ingredient.id
    );
    if (dupItemIndex >= 0) {
      this.snackbar.open(`Produkt już dodano do listy!`, undefined, {
        duration: 4000,
        panelClass: ['snackbar-warning'],
      });
      return;
    }

    this.shoppingList?.items.push({
      id: this.store.createId(),
      ingredient,
      bought: false,
    } as ShoppingItem);

    this.store
    .collection(CollectionKey.ShoppingList)
    .doc(Constants.LIST_CONTAINER_ID)
    .update(this.shoppingList);

    // clear filter when added item was the only one on the list or input was long
    if (this.getFilteredIngredientsCount() == 1 || (this.productSearch?.value ?? '').length > 3) {
      this.clearFilter();
    }

    this.snackbar.open(`Dodano '${ingredient.name}' do listy`, undefined, {
      duration: 4000,
      panelClass: ['snackbar-info'],
    });

    ingredient.addedToList = true;
  }

  getFilteredIngredientsCount() : number {
    let count = 0;
    this.categories.forEach((c) => {
      if (this.filteredIngredients[c]) {
        count += this.filteredIngredients[c].length;
      }
    });
    return count;
  }

  addNewIngredient(
    category: ProductCategory,
    ingredientContainer: IngredientContainer | null = null
  ) {
    const productName = this.productInputs[category.id].toLowerCase();
    const dupIndex = this.ingredients[category.id]?.findIndex(
      (i) => i.name === productName
    );
    if (dupIndex >= 0) {
      this.snackbar.open(`Produkt '${productName}' już istnieje!`, undefined, {
        duration: 4000,
        panelClass: ['snackbar-warning'],
      });
      return;
    }

    const newProduct = {
      id: this.store.createId(),
      name: productName,
      unit: this.unitInputs[category.id] ?? null,
      quantity: this.quantityInputs[category.id] ?? null,
      categoryId: category.id,
    } as Ingredient;

    if (ingredientContainer) {
      if (!ingredientContainer.ingredients) {
        ingredientContainer.ingredients = [];
      }
      ingredientContainer.ingredients.push(newProduct);
      this.store
        .collection(CollectionKey.ShoppingList)
        .doc(Constants.INGREDIENTS_CONTAINER_ID)
        .update(ingredientContainer);
      this.productInputs[category.id] = '';
    }
  }

  clearSelection() {
    this.categories.forEach((c) => {
      this.ingredients[c].forEach((i) => (i.addedToList = false));
    });
  }
}
