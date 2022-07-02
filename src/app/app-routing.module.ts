import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { HouseTasksComponent } from './components/house-tasks/house-tasks.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { VisitsComponent } from './components/visits/visits.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { RecipeDetailsComponent } from './components/recipes/recipe-details.component';
import { ShoppingComponent } from './components/shopping/shopping.component';

const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: UserProfileComponent},
    { path: 'house-tasks', component: HouseTasksComponent, canActivate: [AuthGuard]},
    { path: 'visits', component: VisitsComponent, canActivate: [AuthGuard]},
    { path: 'recipes', component: RecipesComponent, canActivate: [AuthGuard]},
    { path: 'recipes/:id', component: RecipeDetailsComponent, canActivate: [AuthGuard]},
    { path: 'recipes/new', component: RecipeDetailsComponent, canActivate: [AuthGuard]},
    { path: 'shopping', component: ShoppingComponent, canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
