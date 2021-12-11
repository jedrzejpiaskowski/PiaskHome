import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Recipe, TagContainer } from 'src/models/recipe';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CollectionKey } from 'src/models/colletion-keys';
import { DateUtilityService } from 'src/app/services/date-utility.service';
import { Constants } from 'src/models/constants';
import { Tag } from 'src/models/tag';

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss'],
})
export class RecipesComponent implements OnInit {
  allRecipes$: Observable<Recipe[]>;
  filteredRecipes$: Observable<Recipe[]>;
  selectedTags$ = new BehaviorSubject<string[]>([]);
  tagContainer$: Observable<TagContainer | undefined>;
  tags: Tag[] = [];

  constructor(
    private store: AngularFirestore,
    private dateUtilityService: DateUtilityService
  ) {

    this.allRecipes$ = this.store
      .collection<Recipe>(CollectionKey.Recipes, (ref) => {
        let query:
          | firebase.default.firestore.CollectionReference
          | firebase.default.firestore.Query = ref;
        query = query.orderBy('creationDate', 'desc');
        return query;
      })
      .valueChanges({ idField: 'id' })
      .pipe(
        map((recipes) => {
          recipes.map((r) => {
            r.creationDate = this.dateUtilityService.getDateFromTimeStamp(
              r.creationDate
            );
            r.tags = r.tags.sort();
          });
          return recipes;
        })
      );

      this.filteredRecipes$ = combineLatest([this.allRecipes$, this.selectedTags$])
      .pipe(
        map(([recipes, tags]) => {
          if (tags?.length === 0) {
            return recipes;
          }
          return recipes.filter(r => tags.every(t => r.tags.includes(t)));
        })
      );

    this.tagContainer$ = this.store
      .doc<TagContainer>(
        `${CollectionKey.RecipeTags}/${Constants.TAG_CONTAINER_ID}`
      )
      .valueChanges()
      .pipe(
        tap((tc) => {
          if (tc && tc.tags) {
            this.tags = [];
            tc.tags.sort().map((t) => {
              this.tags.push({
                value: t,
                selected: false,
              } as Tag);
            });
          }
        })
      );
  }

  tagChanged(tag: Tag) {
    tag.selected = !tag.selected;
    this.selectedTags$.next(this.tags.filter(t => t.selected).map(t => t.value));
  }

  anySelected(): boolean {
    return this.tags.some(t => t.selected);
  }

  clearTags() {
    console.log('?');
    this.tags.forEach(t => t.selected = false);
    this.selectedTags$.next([]);
  }

  ngOnInit(): void {}
}
