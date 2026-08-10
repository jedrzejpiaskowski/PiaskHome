import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { HouseTasksComponent } from './components/house-tasks/house-tasks.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AuthService } from './services/auth.service';
import {
  MatMomentDateModule,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { AuthGuard } from './auth.guard';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { PatientsComponent } from './components/patients/patients.component';
import '@angular/common/locales/global/pl';
// @ts-ignore - moment ships this file without type declarations for the subpath
import 'moment/locale/pl';
import { VisitsComponent } from './components/visits/visits.component';
import { ConfirmationDialogComponent } from './dialogs/confirmation-dialog/confirmation-dialog.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { HouseTasksChartsComponent } from './components/house-tasks-charts/house-tasks-charts.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { RecipeDetailsComponent } from './components/recipes/recipe-details.component';
import { DragDropDirective } from './directives/drag-drop.directive';
import { ImageViewerDialogComponent } from './dialogs/image-viewer-dialog/image-viewer-dialog.component';
import { ShoppingComponent } from './components/shopping/shopping.component';
import { ShoppingListComponent } from './components/shopping/shopping-list/shopping-list.component';
import { IngredientsComponent } from './components/shopping/ingredients/ingredients.component';
import { TodoComponent } from './components/todo/todo.component';
import { TodoDialogComponent } from './dialogs/todo-dialog/todo-dialog.component';
import { EventsComponent } from './components/events/events.component';
import { EventDialogComponent } from './dialogs/event-dialog/event-dialog.component';
import { DayEventsDialogComponent } from './dialogs/day-events-dialog/day-events-dialog.component';

@NgModule({ declarations: [
        AppComponent,
        HouseTasksComponent,
        UserProfileComponent,
        PatientsComponent,
        VisitsComponent,
        ConfirmationDialogComponent,
        HouseTasksChartsComponent,
        RecipesComponent,
        RecipeDetailsComponent,
        RecipeDetailsComponent,
        DragDropDirective,
        ImageViewerDialogComponent,
        ShoppingComponent,
        ShoppingListComponent,
        IngredientsComponent,
        TodoComponent,
        TodoDialogComponent,
        EventsComponent,
        EventDialogComponent,
        DayEventsDialogComponent,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatInputModule,
        MatFormFieldModule,
        MatProgressBarModule,
        MatTableModule,
        MatPaginatorModule,
        MatSidenavModule,
        MatListModule,
        MatDatepickerModule,
        MatMomentDateModule,
        MatTabsModule,
        MatDialogModule,
        MatButtonToggleModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatSelectModule,
        MatSnackBarModule,
        FormsModule,
        ReactiveFormsModule,
        NgxChartsModule], providers: [
        AuthGuard,
        AuthService,
        { provide: LOCALE_ID, useValue: 'pl-PL' },
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic' } },
        provideHttpClient(withInterceptorsFromDi()),
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideAuth(() => {
          const auth = getAuth();
          auth.useDeviceLanguage();
          return auth;
        }),
        provideFirestore(() => getFirestore()),
        provideStorage(() => getStorage()),
    ] })
export class AppModule {}
