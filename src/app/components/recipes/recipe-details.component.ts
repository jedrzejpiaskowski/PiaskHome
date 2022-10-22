import { Direction } from '@angular/cdk/bidi';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, iif, Observable, of } from 'rxjs';
import {
  finalize,
  map,
  mergeMap,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import { ImageViewerDialogComponent } from 'src/app/dialogs/image-viewer-dialog/image-viewer-dialog.component';
import { CollectionKey } from 'src/models/colletion-keys';
import { Constants } from 'src/models/constants';
import { ImageHandle } from 'src/models/image';
import { Recipe, TagContainer } from 'src/models/recipe';

@Component({
  selector: 'app-recipe-details',
  templateUrl: './recipe-details.component.html',
  styleUrls: ['./recipe-details.component.scss'],
})
export class RecipeDetailsComponent {
  recipeForm: UntypedFormGroup;
  tagsControl = new UntypedFormControl('');
  tagContainer$: Observable<TagContainer | undefined>;
  tags: string[] = [];
  availableTags: string[] = [];
  images: ImageHandle[] = [];
  imageIndex = 0;
  filteredTags: Observable<string[]>;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  editing = false;
  recipe$: Observable<Recipe | undefined>;
  recipeId: string | null;
  recipeId$: BehaviorSubject<string | null>;
  rating: number | null = null;
  ratings = [1, 2, 3, 4, 5];
  maxFileSize = 1_000_000;
  @ViewChild('tagsInput') tagsInput!: ElementRef<HTMLInputElement>;

  constructor(
    private store: AngularFirestore,
    private route: ActivatedRoute,
    private storage: AngularFireStorage,
    private sanitizer: DomSanitizer,
    private snackbar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.recipeForm = new UntypedFormGroup({
      id: new UntypedFormControl(),
      title: new UntypedFormControl('', Validators.required),
      creationDate: new UntypedFormControl(new Date()),
      description: new UntypedFormControl(''),
      imageUrls: new UntypedFormControl([]),
      url: new UntypedFormControl(''),
      calories: new UntypedFormControl(null),
      prepTime: new UntypedFormControl(null),
      rating: new UntypedFormControl(null),
      tags: this.tagsControl,
      saved: new UntypedFormControl(),
    });

    this.filteredTags = this.tagsControl.valueChanges.pipe(
      startWith([]),
      map((tag: string | null) =>
        tag ? this._filter(tag) : this.availableTags.slice()
      )
    );

    this.tagContainer$ = this.store
      .doc<TagContainer>(
        `${CollectionKey.Recipes}/${Constants.TAG_CONTAINER_ID}`
      )
      .valueChanges()
      .pipe(
        tap((tc) => {
          if (tc && tc.tags) {
            this.availableTags = tc.tags.sort();
          }
        })
      );

    this.recipeId = this.route.snapshot.paramMap.get('id');
    this.recipeId$ = new BehaviorSubject(this.recipeId);
    this.recipe$ = this.recipeId$.pipe(
      switchMap((_id) =>
        this.store
          .doc<Recipe>(`${CollectionKey.Recipes}/${_id}`)
          .valueChanges({ idField: 'id' })
      ),
      mergeMap((r) =>
        iif(() => r?.id !== 'new', of(r), of(this.createNewRecipe()))
      ),
      tap((r) => {
        if (r) {
          if (!r.imageUrls) {
            r.imageUrls = [];
          }
          this.rating = r.rating = r.rating ?? null;
          r.calories = r.calories ?? null;
          r.prepTime = r.prepTime ?? null;
        }
        this.images = [];
        this.tags = r?.tags ?? [];
        this.recipeForm.setValue({ ...r });
        if (r?.imageUrls) {
          this.images.push(
            ...r.imageUrls.map((url) => {
              return {
                downloadUrl: url,
                uploaded: true,
              } as Partial<ImageHandle> as ImageHandle;
            })
          );
        }
        if (!r?.id) {
          this.editing = true;
        }
      })
    );
  }

  discardRecipe() {
    this.recipeId$.next(this.recipeId);
    this.editing = false;
  }

  createNewRecipe(): Recipe {
    return {
      id: '',
      title: 'Nowy przepis...',
      description: '',
      url: '',
      calories: null,
      prepTime: null,
      tags: [],
      imageUrls: [],
      saved: false,
      creationDate: new Date(),
      rating: null
    } as Partial<Recipe> as Recipe;
  }

  remove(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const tagValue = event.option.viewValue.toLowerCase();
    const duplicate = this.tags.find((t) => t === tagValue);
    if (!duplicate) {
      this.tags.push(tagValue);
      this.tagsInput.nativeElement.value = '';
      this.tagsControl.setValue(null);
    }
  }

  private _filter(value: string): string[] {
    const filterValue = String(value).toLowerCase();
    return this.availableTags.filter((tag) =>
      tag.toLowerCase().includes(filterValue)
    );
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim().toLowerCase();
    console.log(value);
    if (value) {
      const duplicate = this.tags.find((t) => t === value);
      if (!duplicate) {
        this.tags.push(value);
      }
    }

    event.chipInput!.clear();
    this.tagsControl.setValue(null);
  }

  saveRecipe(
    stopEditing: boolean = true,
    tagContainer: TagContainer | null = null
  ) {
    const recipe = this.recipeForm.getRawValue() as Recipe;
    recipe.imageUrls = this.images.filter((i) => i).map((i) => i.downloadUrl);
    this.tags = [...new Set(this.tags)];
    recipe.tags = this.tags;
    recipe.rating = this.rating;

    if (tagContainer) {
      this.updateTags(tagContainer, this.tags);
    }

    if (!recipe.saved) {
      recipe.saved = true;
      recipe.creationDate = new Date();
      this.store.collection(CollectionKey.Recipes).add(recipe);
    } else {
      this.store
        .collection(CollectionKey.Recipes)
        .doc(recipe.id)
        .update(recipe);
    }
    if (stopEditing) {
      this.editing = false;
    }
  }

  updateTags(tagContainer: TagContainer, tags: string[]) {
    const newTags = tags.filter((t) => !tagContainer.tags.includes(t));
    if (newTags.length > 0) {
      tagContainer.tags.push(...newTags);
      this.store
        .collection(CollectionKey.Recipes)
        .doc(Constants.TAG_CONTAINER_ID)
        .update(tagContainer);
    }
  }

  showImages(imageUrls: string[], i: number) {
    this.dialog.open(ImageViewerDialogComponent, {
      maxWidth: '90vw !important',
      maxHeight: '100vh !important',
      data: { index: i, images: imageUrls },
    });
  }

  deleteImage(image: ImageHandle, recipeSaved: boolean) {
    if (image.downloadUrl) {
      const confirmationDialogRef = this.dialog.open(
        ConfirmationDialogComponent,
        {
          data: 'Czy na pewno chcesz usunąć obraz?',
        }
      );
      confirmationDialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.storage.refFromURL(image.downloadUrl).delete();
          const iid = this.images.findIndex(
            (i) => i.downloadUrl === image.downloadUrl
          );
          if (iid >= 0) {
            this.images.splice(iid, 1);
          }
          if (recipeSaved) {
            // do not update new recipe
            this.saveRecipe(false);
          }
        }
      });
    }
  }

  filesChangedEvent(event: EventTarget | null, recipeSaved: boolean) {
    const htmlElem = event as HTMLInputElement;
    if (htmlElem.files) {
      this.filesDroppedEvent(htmlElem.files, recipeSaved);
    }
  }

  filesDroppedEvent(fileList: FileList, recipeSaved: boolean) {
    const _images: ImageHandle[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      console.log(file);
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        const url = this.sanitizer.bypassSecurityTrustUrl(
          window.URL.createObjectURL(file)
        );
        _images.push({ file, url } as Partial<ImageHandle> as ImageHandle);
      }
    }
    this.filesDropped(_images, recipeSaved);
  }

  filesDropped(files: ImageHandle[] | null, recipeSaved: boolean): void {
    if (files) {
      files.forEach((f, i) => {
        const randomId = Math.random().toString(36).substring(2);
        const id = `${randomId}-${i + 1}`;
        const path = `recipes/${id}`;
        console.log(path);

        const fileRef = this.storage.ref(path);
        const task = this.storage.upload(path, f.file);
        f.uploadProgress$ = task.percentageChanges();
        task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe((url) => {
                f.downloadUrl = url;
                f.uploaded = true;
                if (recipeSaved && i === files.length - 1) {
                  this.saveRecipe(false);
                }
              });
            })
          )
          .subscribe();
        this.images.push(f);
      });
    }
  }

  hasStar(star: number): boolean {
    if (this.rating) {
      return this.rating >= star;
    }
    return false;
  }

  changeRating(star: number) {
    if (this.rating === star) {
      this.rating = null;
    } else {
      this.rating = star;
    }
    this.saveRecipe();
  }

  editRecipe() {
    this.editing = true;
  }

  copyUrl() {
    const url = window.location.href;
    console.log(url);
    navigator.clipboard.writeText(url);
    this.snackbar.open('Link skopiowany', undefined, {
      duration: 2000,
      panelClass: ['snackbar-info'],
    });
  }
}
