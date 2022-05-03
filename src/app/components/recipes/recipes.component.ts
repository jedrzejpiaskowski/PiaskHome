import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
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
  selectedTags$ = new BehaviorSubject<string[]>([]);
  tagContainer$: Observable<TagContainer | undefined>;
  tags: Tag[] = [];
  startingTags: Tag[] = [];

  constructor(
    private store: AngularFirestore,
    private dateUtilityService: DateUtilityService
  ) {
    this.allRecipes$ = this.selectedTags$.pipe(
      debounceTime(200),
      switchMap((tags) => {
        if (!tags || tags.length === 0) {
          return combineLatest([of([] as Recipe[]), of(tags)]);
        }
        const rec = this.store
          .collection<Recipe>(CollectionKey.Recipes, (ref) => {
            let query:
              | firebase.default.firestore.CollectionReference
              | firebase.default.firestore.Query = ref;
              // can only use single 'array-contains', rest of the tags is filtered 'offline'
            query = query.where('tags', 'array-contains', tags[0]);
            query = query.orderBy('creationDate', 'desc');
            return query;
          })
          .valueChanges({ idField: 'id' });

        let remaingingTags: string[] = [];
        if (tags.length > 1) {
          remaingingTags = tags.slice(1, tags.length);
        }
        return combineLatest([rec, of(remaingingTags)]);
      }),
      map(([recipes, remaingingTags]) => {
        let _recipes = recipes as Recipe[];
        _recipes.map((r) => {
          r.creationDate = this.dateUtilityService.getDateFromTimeStamp(
            r.creationDate
          );
          r.tags = r.tags.sort();
        });
        if (remaingingTags) {
          _recipes = _recipes.filter((r) =>
            remaingingTags.every((t) => r.tags.includes(t))
          );
        }
        return _recipes;
      }),
      tap((recipes) => {
        let filteredTags = this.selectedTags$.getValue();
        if (filteredTags?.length > 0) {
          recipes.forEach((r) => {
            filteredTags = filteredTags.concat(r.tags);
          });
          filteredTags = filteredTags
            .filter((item, pos) => filteredTags.indexOf(item) === pos)
            .sort();
          this.mergeTags(filteredTags);
        } else {
          this.tags = this.startingTags;
        }
      })
    );

    this.tagContainer$ = this.store
      .doc<TagContainer>(
        `${CollectionKey.Recipes}/${Constants.TAG_CONTAINER_ID}`
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
              this.startingTags = this.tags;
            });
          }
        })
      );
  }

  mergeTags(allFilteredTags: string[]) {
    let mergedTags: Tag[] = allFilteredTags.map((ft) => {
      const existing = this.tags.find((t) => t.value === ft);
      if (existing) {
        return existing;
      }
      let mt = {
        value: ft,
        selected: this.tags.some((t) => t.value === ft && t.selected),
      } as Tag;
      return mt;
    });
    this.tags = mergedTags;
  }

  tagChanged(tag: Tag) {
    tag.selected = !tag.selected;
    this.selectedTags$.next(
      this.tags.filter((t) => t.selected).map((t) => t.value)
    );
  }

  anySelected(): boolean {
    return this.tags.some((t) => t.selected);
  }

  clearTags() {
    this.tags.forEach((t) => (t.selected = false));
    this.selectedTags$.next([]);
  }

  hasStar(star: number, rating: number | null): boolean {
    if (!rating) {
      return false;
    }
    return rating >= star;
  }

  ngOnInit(): void {}
}
