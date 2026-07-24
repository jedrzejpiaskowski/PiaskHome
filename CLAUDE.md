# Angular Project

This is an Angular + Angular Material app (PiaskHome), backed by Firebase (Firestore/Auth/Storage via `@angular/fire`). The UI is in Polish and the locale is `pl-PL`.

## Project Structure
- `src/app/` - Application source code
- `src/app/components/` - Feature/route components (e.g. house-tasks, visits, recipes, shopping, todo)
- `src/app/services/` - Injectable services (`providedIn: 'root'`)
- `src/app/dialogs/` - Material dialog components
- `src/app/directives/` - Custom directives
- `src/app/data/` - Static/seed data
- `src/app/auth.guard.ts` - Route guard (lives at the `app/` root)
- `src/models/` - TypeScript interfaces and types (note: `src/models`, NOT `src/app/models`)
- `src/environments/` - Environment configurations

## Architecture
- **NgModule-based**, not standalone. Components are declared in `src/app/app.module.ts` and routes in `src/app/app-routing.module.ts`.
- Components use `standalone: false` in the `@Component` decorator.
- Guarded routes use `canActivate: [AuthGuard]`.
- State/data flows through RxJS observables backed by Firestore (`collectionData`/`docData`), with `moment` for dates.

## Dates
- The Material datepicker uses the **moment** adapter configured with `useUtc: true` (`MAT_MOMENT_DATE_ADAPTER_OPTIONS`), so a datepicker-bound value is a **Moment**, not a `Date`.
- Convert Moments to a JS `Date` (`.toDate()`) before writing to Firestore — Firestore rejects raw Moment objects.
- When building a date from a calendar day, pin it to UTC midnight (`moment.utc('YYYY-MM-DD')`) so it round-trips consistently with datepicker selections, and render such dates with the `'UTC'` timezone to avoid off-by-one display.
- Reading back: convert Firestore timestamps to `Date` via `DateUtilityService.getDateFromTimeStamp`.

## Code Style
- Use strict TypeScript settings.
- Follow the Angular style guide (angular.dev) where it doesn't conflict with the existing patterns above.
- Templates use Angular Material components (`mat-*`) and Material icons.
- Templates use the built-in control flow syntax (`@if`, `@for`, `@empty`), not the older `*ngIf`/`*ngFor`.

## Conventions
- Use **constructor injection** (matches the existing code), e.g. `constructor(private store: Firestore, ...)`.
- Services are `@Injectable({ providedIn: 'root' })` and named for their domain (e.g. `AuthService`, `DateUtilityService`).
- When adding a new feature component, wire it up in three places: declare it in `app.module.ts`, add its route in `app-routing.module.ts`, and add menu entries in `app.component.html` (both the desktop nav and the sidenav).
- No barrel exports (`index.ts`) are used in this project.

## Git commits
- Never run `git commit` unless the most recent message is an explicit, current instruction to commit (e.g. "commit this", "yes, commit"). When in doubt, show the diff/status and ask first.

## Commands
- `ng serve` - Start development server
- `ng build` - Build for production
- `ng test` - Run unit tests with Karma
- `ng lint` - Run ESLint
- `ng generate component <name>` - Generate new component

### Node version
- The Angular CLI requires Node 22.22+/24.15+/26+; if the default `node` is older, use `fnm` to run CLI commands with a compatible version, invoking the CLI entry script directly (the `npx`/`ng` shims aren't found via `fnm exec`):
  - `fnm exec --using=26.5.0 node node_modules/@angular/cli/bin/ng.js build`
  - `fnm exec --using=26.5.0 node node_modules/@angular/cli/bin/ng.js serve`
