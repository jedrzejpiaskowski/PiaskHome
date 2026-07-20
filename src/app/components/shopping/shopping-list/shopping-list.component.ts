import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UntypedFormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
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
  selector: 'app-shopping-list',
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss'],
})
export class ShoppingListComponent implements OnChanges {
  @Input() mode: ShoppingMode = ShoppingMode.View;
  @Input() shoppingList: ShoppingListContainer | null = null;

  categories$: Observable<ProductCategory[]>;
  categories: string[] = [];
  categoriesIcons: { [category: string]: string } = {};
  products: Ingredient[] = [];
  filteredProducts$: Observable<Ingredient[]> = of([]);
  items: { [category: string]: ShoppingItem[] } = {};
  productControl = new UntypedFormControl();
  product: Ingredient | null = null;
  quantity: number | null = null;
  unit: string | null = null;
  units = units;

  constructor(private store: AngularFirestore, private dialog: MatDialog) {
    this.categories$ = this.store
      .collection<ProductCategory>(CollectionKey.ProductCategories, (ref) =>
        ref.orderBy('order')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        tap((cat) => {
          this.categoriesIcons = {};
          cat.forEach((c) => {
            this.categoriesIcons[c.id] = c.icon;
          });
        })
      );

    this.store
      .doc<IngredientContainer>(
        `${CollectionKey.ShoppingList}/${Constants.INGREDIENTS_CONTAINER_ID}`
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map((ingC) => {
          return ingC?.ingredients ?? [];
        }),
        tap((_p) => {
          this.products = _p.sort((a, b) => a.name.localeCompare(b.name));
          this.filteredProducts$ = this.productControl?.valueChanges.pipe(
            startWith(''),
            map((value) => (typeof value === 'string' ? value : value?.name)),
            map((name) => (name ? this._filter(name) : this.products.slice()))
          );
        })
      )
      .subscribe();

    this.productControl.valueChanges.pipe(tap((x) => console.log(x)));
  }

  addItemToList() {
    const inputProduct = this.productControl.value as Ingredient;
    const dupId = this.shoppingList?.items.findIndex(
      (i) => i.ingredient.id === inputProduct.id
    );
    if (inputProduct && dupId === -1) {
      if (this.quantity) {
        inputProduct.quantity = this.quantity;
      }
      if (this.unit) {
        inputProduct.unit = this.unit;
      }
      let item = {
        id: this.store.createId(),
        ingredient: inputProduct,
        bought: false,
      } as ShoppingItem;
      this.shoppingList?.items.length;
      this.shoppingList?.items.push(item);
      this.updateItems();
      this.product = this.unit = this.quantity = null;
      this.productControl.reset();
    }
  }

  clearList(all: boolean) {
    let clearMsg = all
      ? 'Czy na pewno chcesz wyczyścić listę?'
      : 'Czy na pewno chcesz wyczyścić kupione?';
    const confirmationDialogRef = this.dialog.open(
      ConfirmationDialogComponent,
      { data: clearMsg }
    );
    confirmationDialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.shoppingList) {
        if (all) {
          this.shoppingList.items = [];
        } else if (this.shoppingList) {
          const notBought = this.shoppingList.items.filter(i => i.bought === true);
          notBought.forEach(i => {
            const id = this.shoppingList?.items.indexOf(i);
            if (id && id >= 0) {
              this.shoppingList?.items.splice(id, 1);
            }
          })
        }
        this.updateItems();
      }
    });
  }

  anyNotBoughtRemainging(): boolean {
    if (this.shoppingList && this.shoppingList.items?.length > 0) {
      return this.shoppingList.items.some((i) => !i.bought);
    }
    return false;
  }

  ingredientSelected(event: MatAutocompleteSelectedEvent) {
    if (event?.option?.value) {
      this.product = event.option.value as Ingredient;
      this.quantity = this.product.quantity;
      this.unit = this.product.unit;
    }
  }

  itemBoughtChanged() {
    this.updateItems();
  }

  deleteItem(item: ShoppingItem) {
    if (!this.shoppingList) return;

    const deleteId = this.shoppingList.items.findIndex((i) => i.id === item.id);
    if (deleteId >= 0) {
      this.shoppingList.items.splice(deleteId, 1);
      this.updateItems();
    }
  }

  updateItems() {
    if (!this.shoppingList) {
      return;
    }
    this.store
      .collection(CollectionKey.ShoppingList)
      .doc(Constants.LIST_CONTAINER_ID)
      .update(this.shoppingList);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']?.currentValue === 'view') {
      this.updateItems();
    }
    const list = changes['shoppingList']?.currentValue as ShoppingListContainer;
    if (list) {
      this.items = {};
      this.categories = [];
      if (list.items) {
        list.items.forEach((i) => {
          if (!this.items[i.ingredient.categoryId]) {
            this.items[i.ingredient.categoryId] = [];
            this.categories.push(i.ingredient.categoryId);
          }
          this.items[i.ingredient.categoryId].push(i);
        });
        this.categories.forEach((c) => {
          this.items[c].sort((a, b) => {
            if ((a.bought && b.bought) || (!a.bought && !b.bought)) {
              return a.ingredient.name.localeCompare(b.ingredient.name);
            }
            if (a.bought && !b.bought) {
              return 1;
            }
            return -1;
          });
        });
      }
    }
  }

  setFormItemUnit(unit: string) {
    const inputProduct = this.productControl.value as Ingredient;
    if (inputProduct) {
      this.setItemUnit(inputProduct, unit);
    }
  }

  setItemUnit(ingredient: Ingredient | null, unit: string) {
    if (!ingredient) {
      return;
    }
    if ((unit === 'opak' || unit === 'szt') && !ingredient?.quantity) {
      ingredient.quantity = 1;
    } else if (!unit) {
      ingredient.quantity = null;
    }
  }

  displayFn(ing: Ingredient): string {
    return ing && ing.name ? ing.name : '';
  }

  private _filter(name: string): Ingredient[] {
    const filterValue = name.toLowerCase();
    let productsCopy = this.products.filter(
      (p) => !this.shoppingList?.items.find((i) => i.ingredient.id === p.id)
    );
    return productsCopy.filter((prod) =>
      prod.name.toLowerCase().includes(filterValue)
    );
  }
}
