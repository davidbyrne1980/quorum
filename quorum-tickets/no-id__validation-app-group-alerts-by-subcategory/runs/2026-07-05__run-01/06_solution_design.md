# Solution Design

## Decision ID
D02

## Summary
Add a product sub-category grouping mode to the existing validation app dashboard grouping control.

Data/API Reviewer conclusion: `subcategory` already exists in the frontend type, backend models, session API flow, CSV import, and seed data. No data-model or API contract change is required.

## Proposed Behaviour
- The dashboard group selector includes `Sub-category`.
- Rank remains the default view.
- Selecting `Sub-category` groups alerts by `Alert.subcategory`.
- Group headings display sub-category name and count.
- Missing, blank, or null sub-category values display as `Uncategorised`.
- Alerts inside each group retain the existing `sortByRank` behaviour.
- Opening an alert from a sub-category group preserves group-scoped capture navigation.
- Existing Department and Type grouping remain available.
- Existing validation workflow remains unchanged.

## Technical Approach

### 1. Dashboard Grouping
Update `client/src/pages/Dashboard.tsx`:

- Extend `GroupBy` from `'rank' | 'department' | 'type'` to include `'subcategory'`.
- Add a `Sub-category` segmented-control button.
- Update grouped key selection:
  - `department` uses `alert.category`
  - `subcategory` uses `alert.subcategory`
  - `type` uses `alert.alert_type`
- Add a small normalisation helper for grouped labels:
  - trim string values
  - use `Uncategorised` for null, undefined, or blank values
- Keep current group heading/count rendering.
- Keep current alphabetical group-key sorting.
- Keep current `sortByRank` within groups.

### 2. Capture Navigation
Update `client/src/pages/Capture.tsx`:

- Extend query-param handling to accept `group=subcategory`.
- When group is `subcategory`, filter capture navigation by normalised `alert.subcategory`.
- Preserve existing behaviour for department/type/rank.

### 3. Data/API
No backend or API changes are required.

Evidence:

- `client/src/types/index.ts`: `Alert` includes `subcategory: string`.
- `api/models/alert.py`: `Alert` includes `subcategory: Optional[str] = None`.
- `api/routers/sessions.py`: `AlertIn` and `AlertImportRow` include `subcategory`.
- `api/routers/sessions.py`: session fetch attaches alerts from Supabase.
- `client/src/pages/NewSession.tsx`: CSV parser reads `subcategory`, `sub_category`, and `subcat`.

### 4. Tests / Verification
No test files were found under `client/src`.

Recommended verification:

- `npm run typecheck` in `client`
- `npm run lint` in `client`
- `npm run build` in `client`
- Manual check with seed/session data containing multiple subcategories
- Manual check for missing/blank subcategory if fixture coverage is added

## Files / Areas Expected To Change
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Capture.tsx`

Possible fixture/test support:
- `client/src/store/seed-sessions.json` only if a missing-subcategory fixture is needed for manual verification.

## Data / API Impact
No data model or API contract changes required.

The existing field is:

```text
subcategory
```

Defensive UI normalisation is still required because backend models allow null/optional values.

## Test Approach
Do not produce `07_test_plan.md` yet. At design level, D02 approval should permit a test plan covering:

- Sub-category grouping renders expected groups.
- Group counts are correct.
- Missing/blank values render under `Uncategorised`.
- Existing Rank grouping still defaults and works.
- Existing Department and Type grouping still work.
- Capture next/previous navigation remains scoped to selected sub-category.
- Validation save/skip/photo flows still work.
- Submit flow still uses ungrouped `session.alerts` data and is unchanged.

## Risks
- Current grouping query params use `department` and `type`; adding `subcategory` requires Capture to understand the new value.
- If any real API rows have null subcategory, frontend type strictness may hide the possibility at compile time. Runtime normalisation addresses this.
- The button label may need product wording confirmation (`Sub-category` vs `Subcategory`).
- With no existing automated tests, manual verification is important unless a small test harness is introduced.

## Human Approval Options
1. Approve solution design and proceed to test plan.
2. Approve solution design with wording change for the grouping label.
3. Request design changes.
4. Escalate to CoE Pass 2 reduced council because broader impact is suspected.

## Recommendation
Choose Option 1. Codebase inspection confirms the field already exists and the change can be handled as a narrow UI grouping enhancement with small capture-navigation support.
