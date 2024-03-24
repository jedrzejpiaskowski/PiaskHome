import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
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
import { VoiceRecognitionService } from 'src/app/services/voice-recognition.service';
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
export class IngredientsComponent implements OnChanges, OnInit {
  @Input() mode: string = ShoppingMode.View;
  @Input() shoppingList: ShoppingListContainer | null = null;

  categories$: Observable<ProductCategory[]>;
  categories: string[] = [];
  productSearch = new FormControl('');
  productInputs: { [category: string]: string } = {};
  quantityInputs: { [category: string]: number | null } = {};
  unitInputs: { [category: string]: string | null } = {};
  ingredients: { [category: string]: Ingredient[] } = {};
  allIngredients: Ingredient[] = [];
  voiceSearchResults: Ingredient[] = [];
  filteredIngredients: { [category: string]: Ingredient[] } = {};
  ingredientContainer$: Observable<IngredientContainer | undefined>;
  units = units;
  IngredientsKey = CollectionKey.Ingredients;
  searchForm: UntypedFormGroup;
  processedWords: string[] = [];
  listening = false;

  constructor(
    private store: AngularFirestore,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private stringService: StringUtilityService,
    private voiceRecognition: VoiceRecognitionService
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
              this.allIngredients.push(i);
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
          const filNormalized = this.stringService
            .deaccent(filterInput)
            .toLowerCase();
          this.filteredIngredients = {};
          this.categories.forEach((c) => {
            this.ingredients[c].forEach((ing) => {
              if (
                this.stringService
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

  ngOnInit(): void {
    this.initVoiceInput();
  }

  initVoiceInput() {
    // Subscription for initializing and this will call when user stopped speaking.
    this.voiceRecognition.init().subscribe(() => {
      // User has stopped recording
      // Do whatever when mic finished listening
    });

    // Subscription to detect user input from voice to text.
    this.voiceRecognition.speechInput().subscribe((input) => {
      let clearInput = input;
      console.log(clearInput);
      console.log(this.processedWords);
      this.processedWords.forEach((pw) => {
        clearInput = clearInput.replace(pw, '');
      });
      let clearWords = clearInput
        .split(' ')
        .filter((ci) => ci.length >= 2)
        .map((ci) => ci.trim());

      if (clearWords.length === 0) {
        return;
      }

      if (clearWords.includes('stop')) {
        this.stopVoiceSearch();
        return;
      }
      if (clearWords.includes('dodaj')) {
        this.stopAndAdd();
        return;
      }

      console.log('CW', clearWords);
      let matchingIngredients: Ingredient[] = [];
      clearWords.forEach((cw) => {
        var foundIng = this.allIngredients.filter((ai) =>
          this.containsWord(ai.name, cw)
        );
        foundIng.forEach((fi) => {
          if (matchingIngredients.indexOf(fi) === -1) {
            console.log(`match: ${cw} - ${fi.name}`);
            matchingIngredients.push(fi);
          }
        });
      });

      if (matchingIngredients.length > 0) {
        console.log('matching', matchingIngredients);
        matchingIngredients.forEach((ing) => {
          if (
            !this.voiceSearchResults.find((r) => r.id == ing.id) &&
            this.listening
          ) {
            this.voiceSearchResults.push(ing);
            console.log(`Dodaje: ${ing.name}`);
            this.addProcessedIngredient(ing);
          }
        });
      }
      // Set voice text output to
      // this.searchForm.controls.searchText.setValue(input);
    });
  }

  removeSearchResult(ingredient: Ingredient) {
    const ingIndex = this.voiceSearchResults?.indexOf(ingredient);
    if (ingIndex > -1) {
      this.voiceSearchResults.splice(ingIndex, 1);
      this.addProcessedIngredient(ingredient);
    }
    console.log(this.voiceSearchResults);
  }

  addProcessedIngredient(ing: Ingredient) {
    if (!this.processedWords.includes(ing.name)) {
      this.processedWords.push(ing.name);
    }
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

  saveShoppingList() {
    if (!this.shoppingList) return;

    this.store
      .collection(CollectionKey.ShoppingList)
      .doc(Constants.LIST_CONTAINER_ID)
      .update(this.shoppingList);
  }

  saveSearchResults() {
    if (
      !this.voiceSearchResults ||
      this.voiceSearchResults.length === 0 ||
      !this.shoppingList
    )
      return;

    let savedCount = 0;
    this.voiceSearchResults.forEach((ing) => {
      const index = this.shoppingList?.items.findIndex(
        (i) => i.ingredient.id === ing.id
      );
      if (index && index < 0) {
        savedCount++;
        ing.addedToList = true;
        this.shoppingList?.items.push({
          id: this.store.createId(),
          ingredient: ing,
          bought: false,
        } as ShoppingItem);
      }
    });
    if (savedCount > 0) {
      this.saveShoppingList();
      this.snackbar.open(
        `Dodano ${savedCount} produkt[y] do listy`,
        undefined,
        {
          duration: 4000,
          panelClass: ['snackbar-info'],
        }
      );
      this.clearSearchResults();
    }
  }

  clearSearchResults() {
    this.voiceSearchResults = [];
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

    this.saveShoppingList();

    // clear filter when added item was the only one on the list or input was long
    if (
      this.getFilteredIngredientsCount() == 1 ||
      (this.productSearch?.value ?? '').length > 3
    ) {
      this.clearFilter();
    }

    this.snackbar.open(`Dodano '${ingredient.name}' do listy`, undefined, {
      duration: 4000,
      panelClass: ['snackbar-info'],
    });

    ingredient.addedToList = true;
  }

  getFilteredIngredientsCount(): number {
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

  startVoiceSearch() {
    this.processedWords = [];
    this.voiceSearchResults = [];
    this.voiceRecognition.start();
    this.listening = true;
    console.log('start');
  }

  stopVoiceSearch() {
    this.voiceRecognition.stop();
    this.processedWords = [];
    this.listening = false;
    console.log('stop');
    console.log(this.voiceSearchResults);
  }

  stopAndAdd() {
    this.stopVoiceSearch();
    this.saveSearchResults();
  }

  containsWord(str: string, word: string): boolean {
    return (
      str === word ||
      (word.length > 2 &&
        new RegExp('(?:^|\\s)' + word + '(?:^|\\s|$)').test(str))
    );
  }

  clearSelection() {
    this.categories.forEach((c) => {
      this.ingredients[c].forEach((i) => (i.addedToList = false));
    });
  }
}
