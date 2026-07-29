# Refactor plan: reactive search in `IngredientsComponent`

**Status:** proposed / not started
**Scope:** `src/app/components/shopping/ingredients/ingredients.component.{ts,html}`
**Goal:** derive the filtered ingredient list reactively so change detection is handled
by the `async` pipe, removing the manual `detectChanges()` workarounds.

## Background

The product search filter was originally split across two decoupled pieces:

- the `ingredientContainer$` Firestore stream rebuilt `this.ingredients` and blindly
  reset `this.filteredIngredients`, discarding any active search term;
- the `productSearch.valueChanges` subscription applied the filter on a debounce.

A first round of fixes (already merged) made these consistent by extracting a shared
`applyFilter(term)` method, re-applying the active term on data reload, tightening the
input stream (`debounceTime(200)` + `distinctUntilChanged()`), and — because the
debounced emission fires from a timer outside the keystroke's change-detection tick —
calling `this.changeDetector.detectChanges()` after filtering. The voice-input handler
uses the same manual `detectChanges()` for the same reason (Web Speech events fire
outside Angular's zone).

That manual change detection is the smell this refactor removes: if the filtered list is
exposed as an observable and rendered through `| async`, the async pipe calls
`markForCheck()` on every emission and the view repaints without any manual CD.

## Target design

Render the template from a single derived stream instead of the mutable
`filteredIngredients` map.

1. **Two source streams**
   - `ingredients$` — the ingredient container mapped to
     `{ categories: string[]; byCategory: { [id: string]: Ingredient[] } }`
     (the grouping + per-category sort currently done imperatively in the tap).
   - `searchTerm$` — `productSearch.valueChanges` with
     `startWith(productSearch.value)`, `debounceTime(200)`, `distinctUntilChanged()`,
     and a `map` that deaccents/trims/lowercases the term.

2. **One derived stream**
   ```ts
   filteredIngredients$ = combineLatest([this.ingredients$, this.searchTerm$]).pipe(
     map(([data, term]) => this.filter(data, term)),
   );
   ```
   `filter()` is a pure function: given the grouped data and a normalized term, it returns
   `{ categories: string[]; byCategory: { [id: string]: Ingredient[] } }` with only the
   categories that have matches. No component field mutation.

3. **Template** renders from the async-piped result, e.g.
   ```html
   @if (filteredIngredients$ | async; as filtered) {
     @for (c of data.categories; track c.id) {
       @if (filtered.byCategory[c.id]?.length) { ... }
     }
   }
   ```

## Step-by-step

1. Introduce a small view-model type (inline `interface` or type alias) for the grouped
   result to keep the template typing clean.
2. Build `ingredients$` from the existing `docData(...)` source with a `map` instead of a
   `tap` that mutates fields. Keep `this.allIngredients` populated (voice search still
   reads it) via a `tap`, but assign (`this.allIngredients = ingC.ingredients ?? []`)
   rather than push — the current code already resets it, so this just formalizes it.
3. Build `searchTerm$` as described; move the deaccent/trim/lowercase normalization into
   the stream so `filter()` receives an already-normalized term.
4. Write the pure `filter(data, term)` function (extract the body of today's
   `applyFilter`, minus the field writes).
5. Compose `filteredIngredients$` with `combineLatest`.
6. Update the template to consume `filteredIngredients$ | async` and drop reads of the
   mutable `filteredIngredients` map.
7. Delete the now-dead pieces: the `filteredIngredients` field, `applyFilter`, the
   `productSearch.valueChanges.subscribe(...)` block, and the
   `changeDetector.detectChanges()` call in the search path.
8. Verify `getFilteredIngredientsCount()` (used by `addToShoppingList` to decide whether
   to clear the filter). It currently reads the mutable map. Options:
   - keep a `private latestFiltered` cached from a `tap` on `filteredIngredients$`, or
   - re-derive the "only one result" check differently.
   Pick one and keep the auto-clear behavior on add.

## Follow-on cleanup (optional, same rationale)

Once the pattern is proven, the voice-input handler
(`speechInput().subscribe(... detectChanges())`) can likely drop its manual
`detectChanges()` if its results are also surfaced through an observable + `async` pipe.
Handle in a separate change — it's a distinct code path.

## Risks / watch-outs

- **`allIngredients` for voice search** must stay populated; don't let the move to
  streams drop it.
- **`getFilteredIngredientsCount()` / auto-clear on add** depends on the filtered result —
  make sure it still works after `filteredIngredients` is gone (step 8).
- **`clearFilter()` / `productSearch.reset()`** must still push through `searchTerm$`
  (the `startWith` + `valueChanges` handles this; reset emits a value change).
- **Edit mode** (`productInputs`, add/delete ingredient) writes to Firestore, which
  re-emits `ingredients$`; confirm the list refreshes and the active search is preserved
  (that's the whole point of `combineLatest`).
- Keep `track` expressions stable in `@for` to avoid re-render churn.

## Definition of done

- No `changeDetector.detectChanges()` in the search path; typing filters live.
- Background Firestore re-emissions preserve the active search term.
- Add-to-list auto-clear and edit-mode add/delete still behave as before.
- `ng build` and `ng lint` clean; manual smoke test of type / clear / add / edit.
