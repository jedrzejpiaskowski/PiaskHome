# PiaskHome

An Angular + Angular Material app backed by Firebase (Firestore/Auth/Storage via [@angular/fire](https://github.com/angular/angularfire)). The UI is in Polish (locale `pl-PL`).

Originally generated with [Angular CLI](https://github.com/angular/angular-cli) 12.2.8; currently on Angular 22 (CLI 22.0.7, Material 22.0.5).

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Deployment (Firebase Hosting)

The app is hosted on Firebase project `domek-14cdc`. Three hosting targets are
configured across `.firebaserc` and `firebase.json`, all serving the same build
output (`dist/piask-home/browser`):

| Target   | Site              | URL                             | Purpose                   |
| -------- | ----------------- | ------------------------------- | ------------------------- |
| `live`   | `domek-14cdc`     | https://domek-14cdc.web.app     | Production                |
| `mirror` | `piaskhome`       | https://piaskhome.web.app       | Production, alternate URL |
| `beta`   | `piask-home-beta` | https://piask-home-beta.web.app | Staging / preview         |

### Build first

`firebase deploy` only uploads whatever is already in `dist/` — it does **not**
build. Always build before deploying, or you will republish the previous build:

```bash
ng build
```

### Deploy commands

Deploy to a single target:

```bash
npx firebase deploy --only hosting:beta
```

Deploy to several targets at once (comma-separated, no spaces):

```bash
npx firebase deploy --only hosting:live,hosting:mirror
```

Deploy to every configured target:

```bash
npx firebase deploy --only hosting
```

The usual flow is: build, deploy to `beta`, check it in a browser, then deploy
the same build to `live,mirror`.

### Adding another site

A hosting target maps to **exactly one site**. `firebase target:apply` accepts
several sites without complaining, but the deploy then fails with
`Hosting target live is linked to multiple sites, but only one is permitted`.
To serve the app from an additional URL, give the new site its own target:

```bash
npx firebase hosting:sites:create <site-id>
npx firebase target:apply hosting <target-name> <site-id>
```

Then add a matching block to the `hosting` array in `firebase.json` with
`"target": "<target-name>"` and the same `public` / `rewrites` values as the
others. Note that site IDs are globally unique across all of Firebase, not just
this project, so a given name may already be taken.

### Access

Deploy credentials are **not** stored in this repo. The Firebase CLI keeps them
per-user in `~/.config/configstore/firebase-tools.json`, so cloning the repo does
not grant the ability to deploy. To deploy you need:

```bash
npx firebase login
```

signed in with a Google account that has the Hosting Admin (or Editor/Owner) role
on the `domek-14cdc` project. The Firebase config in `src/environments/` is
public client-side configuration, not deploy credentials.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
