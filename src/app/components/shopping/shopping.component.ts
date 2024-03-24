import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Title } from '@angular/platform-browser';
import { Observable } from 'rxjs/internal/Observable';
import { map, tap } from 'rxjs/operators';
import { CollectionKey } from 'src/models/colletion-keys';
import { Constants } from 'src/models/constants';
import { ShoppingListContainer, ShoppingMode } from 'src/models/ingredients';

@Component({
  selector: 'app-shopping',
  templateUrl: './shopping.component.html',
  styleUrls: ['./shopping.component.scss'],
})
export class ShoppingComponent {
  mode = ShoppingMode.View;
  shoppingList$: Observable<ShoppingListContainer | undefined>;

  constructor(private store: AngularFirestore, private title: Title) {
    this.title.setTitle('Zakupy');
    this.shoppingList$ = this.store
      .doc<ShoppingListContainer>(
        `${CollectionKey.ShoppingList}/${Constants.LIST_CONTAINER_ID}`
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map((list) => {
          if (list?.items?.length === 0) {
            list.items = [];
          }
          return list;
        })
      );
  }

  toggleMode() {
    this.mode =
      this.mode === ShoppingMode.View ? ShoppingMode.Edit : ShoppingMode.View;
  }
}
