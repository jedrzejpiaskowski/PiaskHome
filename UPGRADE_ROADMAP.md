# PiaskHome Dependency Upgrade Roadmap

**Current State (Feb 19, 2026)**
- Angular: 14.3.0
- RxJS: 6.6.7
- Firebase: 9.23.0
- TypeScript: 4.6.4
- Node.js target: 14+ (polyfills included)

**Last cleanup:** Removed `angular-x-image-viewer` blocker; flex-layout aligned to 14.0.0-beta.41.

---

## Phase 1: Angular 14 → 15 (Estimated: 1–2 weeks)

### Goal
Upgrade to the latest v14 patch, then move to Angular 15 with minimal breaking changes.

### Pre-requisites
- [ ] Verify all tests pass at current version
- [ ] Document custom Material theme overrides (if any)

### Steps
1. **Update Angular to latest 14.3.x patch**
   ```bash
   npm install --save-exact @angular/core@14.3.0 @angular/common@14.3.0 \
     @angular/router@14.3.0 @angular/forms@14.3.0 @angular/platform-browser@14.3.0 \
     @angular/platform-browser-dynamic@14.3.0 @angular/compiler@14.3.0 \
     @angular/cdk@14.2.7 @angular/material@14.2.7 --legacy-peer-deps
   ```

2. **Run full test suite**
   ```bash
   npm test
   npm run build
   ```

3. **Update to Angular 15**
   ```bash
   ng update @angular/cli@15 @angular/core@15
   ```

4. **Post-upgrade tasks**
   - [ ] Review any deprecated API warnings
   - [ ] Update Material theme if v15 schema changes
   - [ ] Re-test all feature modules

### Expected Breaking Changes
- Material 14 → 15: MDC migration may require theming updates
- Flex-layout: Already at beta; review if still compatible or migrate to CSS Grid/Flexbox
- RxJS: Still on 6.x, no breaking changes yet

### Validation
- Bundle size should remain ≈2.2 MB (check for increases)
- All Material components render correctly
- Recipes, shopping, visits, and house-tasks features functional

---

## Phase 2: RxJS 6 → 7 (Estimated: 1 week)

### Goal
Modernize reactive streams; improves TypeScript support and performance.

### Steps
1. **Update RxJS**
   ```bash
   npm install rxjs@7 rxfire@6.1.0 --legacy-peer-deps
   ```

2. **Scan for deprecated operators**
   - RxJS 7 removes some operators: `flatten`, `race`, `concat` vs. `combineLatest`
   - Check usages in: `house-tasks.component.ts`, `visits.component.ts`, `recipes.component.ts`

3. **Update combineLatest usage** (if used in array form)
   - Old: `combineLatest([obs1, obs2])`
   - New: `combineLatest([obs1, obs2])` (still works; no change needed)

4. **Run tests and verify**
   ```bash
   npm test
   npm run build
   ```

### Expected Breaking Changes
- Imports may need adjustment: `import { combineLatest } from 'rxjs'`
- Observable unsubscription behavior slightly stricter

### Validation
- Async pipes update correctly
- Voice recognition service (polling/continuous streams) works
- Chart updates responsive

---

## Phase 3: Firebase 9 → 11 (Estimated: 1–2 weeks)

### Goal
Modernize Firebase SDK; improves performance and adds new features.

### Dependencies
- Firebase 9 → 11 requires `@angular/fire` 7.6.1+ (already at 7.6.1) ✓

### Steps
1. **Update Firebase SDK**
   ```bash
   npm install firebase@11 firebaseui@6 --legacy-peer-deps
   ```

2. **Check compat API usage**
   - App currently uses `@angular/fire/compat` (legacy wrapper)
   - Option A (Recommended): Keep compat layer (minimal code changes)
   - Option B (Future): Migrate to new `@angular/fire/compat` → standalone APIs

3. **Review breaking changes**
   - Authentication error handling (error codes may differ)
   - Firestore query API (no changes if using compat)
   - Storage: Check bucket naming

4. **Test Firebase flows**
   - [ ] Google sign-in still works
   - [ ] Firestore CRUD operations (house tasks, recipes, shopping list)
   - [ ] Image uploads to Cloud Storage

### Expected Breaking Changes
- Error message formats may change
- Firestore security rules syntax unchanged

### Validation
- Authentication guard routes correctly
- All Firestore collections accessible
- Image uploads functional

---

## Phase 4: TypeScript 4.6 → 5.0 (Estimated: 3–5 days)

### Goal
Enable modern TypeScript features; improve build performance.

### Steps
1. **Update TypeScript**
   ```bash
   npm install typescript@5.0 @angular/compiler-cli@15 --save-dev --legacy-peer-deps
   ```

2. **Update tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "lib": ["ES2020", "dom"],
       "target": "ES2020",
       "module": "ES2020",
       "strict": true,
       "useDefineForClassFields": true
     }
   }
   ```

3. **Run type check**
   ```bash
   npx tsc --noEmit
   ```

4. **Resolve emerging type errors**

### Expected Breaking Changes
- Stricter `null` / `undefined` handling
- Class field initialization may change behavior

### Validation
- TypeScript compilation passes
- No new type errors in templates

---

## Phase 5: Angular 15 → 18+ (Estimated: 3–4 weeks)

### Goal
Migrate to latest Angular with standalone components (future-proofing).

### Prerequisites
- [ ] Complete Phases 1–4
- [ ] Comprehensive test coverage for all modules

### Planning
- This is a larger step; recommend breaking into 15→16→17→18
- At Angular 17+: Consider migrating NgModules → Standalone Components
- Signals API available in 16+ for reactive state management

### High-Level Steps
1. Migrate to Angular 16 (`ng update @angular/cli@16 @angular/core@16`)
2. Verify & test
3. Migrate to Angular 17 (same pattern)
4. At Angular 18: Consider standalone component migration

### Benefits at End
- Modern build tooling (Vite support)
- Control flow syntax (if/for instead of `*ngIf`/`*ngFor`)
- Signals for reactive state (replaces BehaviorSubject patterns)
- Hydration support (future SSR capability)

---

## Phase 6: Optional Long-Term Improvements

### Migrate to Standalone Components (Post-Angular 17)
- Remove `NgModule` declarations
- Use `bootstrapApplication()` in `main.ts`
- Lazy-load routes with `provideRouter()`

### Migrate BehaviorSubject → Signals
```typescript
// Before
activeDate$ = new BehaviorSubject(new Date().toLocaleDateString());

// After (Angular 16+)
activeDate = signal(new Date().toLocaleDateString());
```

### Replace Moment.js
- Consider `date-fns` or native `Intl` API
- Reduces bundle by ~70KB

### Deprecate flex-layout
- Migrate to CSS Grid/Flexbox utilities in Material
- Angular 17: `@angular/cdk/layout` improvements

---

## Testing Strategy per Phase

### Pre-Phase Checklist
1. Run unit tests: `npm test`
2. Run e2e tests (if available): `npm run e2e`
3. Manual smoke tests:
   - Log in via Google
   - Visit each main route (house-tasks, recipes, visits, shopping)
   - Perform CRUD (create, update, delete) on at least one entity
   - Upload an image and verify
   - Voice search in shopping list

### Post-Upgrade Validation
- Production build: `npm run build`
- Check bundle size: `ng build --stats-json` (compare to baseline)
- Run `npm audit` (fix non-breaking vulnerabilities)

---

## Timeline Estimate

| Phase | Estimated Duration | Risk Level |
|-------|---------------------|-----------|
| Phase 1 (Angular 14→15) | 1–2 weeks | Low |
| Phase 2 (RxJS 6→7) | 1 week | Low |
| Phase 3 (Firebase 9→11) | 1–2 weeks | Medium |
| Phase 4 (TypeScript 4→5) | 3–5 days | Low |
| Phase 5 (Angular 15→18+) | 3–4 weeks | High |
| Phase 6 (Standalone/Signals) | 2–3 weeks | Medium |
| **Total** | **~12 weeks** | — |

### Recommended Execution
- **Aggressive**: Phase 1–4 in parallel (3–4 weeks), then Phase 5 sequentially (3–4 weeks)
- **Conservative**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (12 weeks)

---

## Known Issues & Workarounds

### Issue 1: Material Moment Adapter Deprecation
**Status**: Non-critical (used for date picker)
**Fix**: Keep as-is for now; plan to migrate to native date adapters post-Angular 17

### Issue 2: ngx-charts & swimlane/ngx-charts
**Status**: Version 18.0.1 compatible with Angular 14
**Fix**: Monitor for compatibility in Angular 17+; may need to replace with ng-apexcharts or Plotly

### Issue 3: FirebaseUI v5
**Status**: Outdated; v6+ available but may require integration rewrite
**Fix**: Phase 3 plans Firebase 11 + firebaseui@6

### Issue 4: Flex-layout Beta Status
**Status**: Never reached stable; Angular teams recommend CSS Grid/Flexbox
**Fix**: Phase 6 migration plan

---

## Success Criteria

✅ **Project passes Phase 5 (Angular 18+) when:**
1. All tests pass (unit + e2e, if available)
2. Production build completes without errors
3. Bundle size ≤ 2.5 MB (allowed growth for modern patterns)
4. All 5 main features work end-to-end
5. Security audit shows no critical vulnerabilities

---

## References

- [Angular Update Guide](https://update.angular.io/)
- [RxJS Migration Guide](https://rxjs.dev/guide/v7-migration)
- [Firebase SDK v9+ Docs](https://firebase.google.com/docs/reference/js)
- [TypeScript 5.0 Changelog](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)
