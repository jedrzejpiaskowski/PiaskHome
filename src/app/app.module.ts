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
import { HouseTasksComponent } from './components/house-tasks/house-tasks.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AuthService } from './services/auth.service';
import { USE_DEVICE_LANGUAGE } from '@angular/fire/compat/auth';
import {
  MatMomentDateModule,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { AuthGuard } from './auth.guard';
import { HttpClientModule } from '@angular/common/http';
import { PatientsComponent } from './components/patients/patients.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import '@angular/common/locales/global/pl';
import { VisitsComponent } from './components/visits/visits.component';
import { ConfirmationDialogComponent } from './dialogs/confirmation-dialog/confirmation-dialog.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { HouseTasksChartsComponent } from './components/house-tasks-charts/house-tasks-charts.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { RecipeDetailsComponent } from './components/recipes/recipe-details.component';
import { DragDropDirective } from './directives/drag-drop.directive';
import { AngularImageViewerModule } from 'angular-x-image-viewer';
import { ImageViewerDialogComponent } from './dialogs/image-viewer-dialog/image-viewer-dialog.component';

@NgModule({
  declarations: [
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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AngularFireStorageModule,
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
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    FlexLayoutModule,
    NgxChartsModule,
    AngularImageViewerModule
  ],
  providers: [
    AuthGuard,
    AuthService,
    { provide: USE_DEVICE_LANGUAGE, useValue: true },
    { provide: LOCALE_ID, useValue: 'pl-PL' },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
  ],
  bootstrap: [AppComponent],
  entryComponents: [ConfirmationDialogComponent, ImageViewerDialogComponent],
})
export class AppModule {}
