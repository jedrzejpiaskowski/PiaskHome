# PiaskHome Dependency Upgrade Roadmap

**Current State (Feb 27, 2026)**
- Angular: 16.2.12
- Angular CLI / build-angular: 16.2.16
- Angular Material/CDK: 15.2.9
- RxJS: 7.8.2
- Firebase: 11.10.0
- TypeScript: 4.9.5
- Target/lib: ES2022

**Recent completed work**
- ✅ Angular 14 → 15 migration completed.
- ✅ Material chips migrated to modern API (`MatChipsModule`, `mat-chip-set`, `mat-chip-grid`).
- ✅ Deprecated/legacy Firebase UI dependencies removed (`firebaseui`, `ngx-auth-firebaseui`).
- ✅ Build warnings cleanup (optional chaining, budgets, TypeScript/CLI alignment).
- ✅ Phase 1 completed: RxJS upgraded to 7.8.2 (`rxfire` 6.1.0).
- ✅ Phase 2 completed: Firebase upgraded to 11.10.0.
- ✅ Phase 3 completed: Angular upgraded to 16.2.x with migration run.
- ✅ Test baseline stabilized (spec DI setup for Auth/AuthGuard/HouseTasks).

---

## Completed Phase: Angular 14 → 15

### Outcome
- Project builds successfully on Angular 15.
- Core UI modules (recipes, shopping, visits, house-tasks) compile and run.

### Follow-up still worth doing
- [ ] Run full regression pass on mobile layouts after global Material style compacting.
- [ ] Re-baseline bundle size after upcoming dependency upgrades.

---

## Phase 1 (Completed): RxJS 6 → 7

### Goal
Move to RxJS 7 to unblock Angular 16+ upgrades and modern operator typing.

### Steps
1. **Upgrade packages**
   ```bash
   npm install rxjs@^7.8 rxfire@^6.1.0 --legacy-peer-deps
   ```

2. **Scan and fix incompatible patterns**
   - Verify operator imports from `rxjs`/`rxjs/operators`.
   - Check `combineLatest`, `forkJoin`, and `Subject` usage in feature components/services.

3. **Validate behavior**
   ```bash
   npm test
   npm run build
   ```

### Validation checklist
- [x] No RxJS compile/runtime regressions found.
- [x] Async pipes update correctly (verified by build + tests).
- [x] Voice-recognition/charts code compiles on RxJS 7.

---

## Phase 2 (Completed): Firebase 9 → 11

### Goal
Upgrade Firebase SDK while keeping AngularFire integration stable.

### Important constraint
- Do **not** reintroduce `firebaseui` or `ngx-auth-firebaseui` (previous native dependency issues).

### Steps
1. **Upgrade Firebase only**
   ```bash
   npm install firebase@^11 --legacy-peer-deps
   ```

2. **Review AngularFire compatibility**
   - If needed, upgrade `@angular/fire` to a version compatible with Firebase 11 and Angular 15/16.

3. **Verify auth and data flows**
   - Google sign-in
   - Firestore CRUD (house tasks, recipes, shopping, visits)
   - Storage image upload/download

### Validation checklist
- [x] Authentication guard compile/test behavior unchanged.
- [x] Firestore-dependent services/components compile and unit tests run.
- [ ] Manual browser-console verification for Firebase warnings (pending smoke test).

---

## Phase 3 (Completed): Angular 15 → 16

### Goal
Move to Angular 16 as the stepping stone for Angular 17/18.

### Steps
1. **Framework update**
   ```bash
   ng update @angular/cli@16 @angular/core@16
   ```

2. **Align toolchain**
   - Update TypeScript to Angular 16-supported version.
   - Align `zone.js` and any required peer dependencies.

3. **Run validation**
   ```bash
   npm test
   npm run build
   ```

### Validation checklist
- [x] No template compilation regressions after dependency alignment.
- [ ] Material components and tabs render correctly on mobile (manual pass pending).
- [x] Build succeeds; bundle currently ~2.51 MB initial after Angular 16 + charts upgrade.

### Notes from execution
- `ng update` applied Angular core/cli migrations successfully.
- `@swimlane/ngx-charts` required upgrade to `^20.5.0` for Angular 16 compatibility.
- `house-tasks-charts` scheme input was updated to satisfy newer chart typings.

---

## Phase 4 (Next): Angular 16 → 17 → 18 (Estimated: 2–3 weeks)

### Goal
Complete incremental major upgrades with minimal regressions.

### Strategy
- Upgrade one major at a time: 16 → 17 → 18.
- Build + test after each step before proceeding.

### Steps per major version
1. Run `ng update @angular/cli@<major> @angular/core@<major>`
2. Align Material/CDK and TypeScript to supported ranges
3. Fix migration warnings and run smoke tests

### Validation checklist
- [ ] All main routes functional (`house-tasks`, `recipes`, `visits`, `shopping`).
- [ ] No broken Material controls after MDC/theming changes.
- [ ] Production build succeeds after each major step.

---

## Phase 5 (Optional): Architecture and Bundle Improvements

### 1) Gradual NgModule → standalone migration
- Start with leaf/feature components first.
- Keep routing and providers stable during transition.

### 2) BehaviorSubject-heavy state → Signals (Angular 16+)
- Introduce signals in isolated areas first (e.g., local UI state).
- Keep Observable APIs where external streams are already stable.

### 3) Moment.js replacement
- Evaluate `date-fns` or native `Intl` for lighter bundles.

### 4) Flex-layout deprecation path
- Replace flex-layout usages with SCSS Grid/Flexbox + CDK layout utilities.

---

## Testing Strategy (All Remaining Phases)

### Pre-phase checklist
1. `npm test`
2. `npm run build`
3. Manual smoke tests:
   - Login/auth flow
   - CRUD in recipes, shopping, visits, house-tasks
   - Image upload + preview
   - Mobile layout check (360px width baseline)

### Post-phase checklist
- `npm run build -- --stats-json` and compare bundle trends
- Run `npm audit` and triage non-breaking advisories

---

## Timeline (From Current State)

| Phase | Estimated Duration | Risk |
|---|---:|---|
| Phase 1: RxJS 6→7 | 2–4 days | Low |
| Phase 2: Firebase 9→11 | 3–5 days | Medium |
| Phase 3: Angular 15→16 | 3–5 days | Medium |
| Phase 4: Angular 16→17→18 | 2–3 weeks | High |
| Phase 5: Optional architecture modernization | 1–3 weeks | Medium |

**Total remaining (core phases only):** ~3–5 weeks

---

## Known Risks & Notes

### Material Moment Adapter
**Status:** Acceptable short-term.  
**Plan:** Revisit after Angular 17/18 if date adapter migration is desired.

### `@swimlane/ngx-charts`
**Status:** Works now; future Angular major compatibility may lag.  
**Plan:** Revalidate on Angular 17 and 18; replace only if upgrade is blocked.

### Angular Flex Layout
**Status:** Beta-only package and long-term maintenance risk.  
**Plan:** Gradual replacement as part of optional modernization phase.

### Firebase ecosystem drift
**Status:** SDK and AngularFire versions can diverge quickly across Angular majors.  
**Plan:** Upgrade Firebase with compatibility checks before Angular 17+ jumps.

---

## Success Criteria

Project is considered upgrade-complete when:
1. All configured tests/builds pass on Angular 18.
2. All 4 core feature areas work end-to-end.
3. Mobile UI remains compact and usable on small screens.
4. Bundle stays within configured budgets (or budgets are intentionally re-baselined).
5. No critical vulnerabilities remain unresolved.

---

## References

- [Angular Update Guide](https://update.angular.io/)
- [RxJS v7 Migration](https://rxjs.dev/guide/v7/migration)
- [Firebase JS SDK](https://firebase.google.com/docs/reference/js)
- [TypeScript Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)
