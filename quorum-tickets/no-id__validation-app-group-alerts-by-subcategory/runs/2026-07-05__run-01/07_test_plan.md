# Test Plan

## Scope
Verify the approved solution design for grouping validation app alerts by product sub-category.

Approved D02 option: Option 1 - approve solution design and proceed to test plan.

Implementation scope:

- Add `Sub-category` grouping option to the session dashboard.
- Group by existing `Alert.subcategory`.
- Normalise missing, blank, or null sub-category values to `Uncategorised`.
- Preserve Rank as the default grouping.
- Preserve existing Department and Type grouping.
- Preserve capture navigation within the selected sub-category group.
- Make no backend, API, data-model, submit-flow, validation-action, notes, photo, or backroom behaviour changes.

## Unit Tests
No existing `*.test.*` or `*.spec.*` files were found under `client/src`.

If tests are added, cover:

1. Group-key normalisation:
   - `undefined` -> `Uncategorised`
   - `null` -> `Uncategorised`
   - empty string -> `Uncategorised`
   - whitespace-only string -> `Uncategorised`
   - populated value -> trimmed populated value

2. Group construction:
   - one alert appears in exactly one group
   - group counts match item counts
   - group labels sort alphabetically
   - alerts inside groups preserve existing `sortByRank` behaviour

3. Capture group filtering:
   - `group=subcategory&groupKey=X` filters next/previous navigation to alerts whose normalised sub-category is `X`
   - existing `department` and `type` group filters still work
   - no group params falls back to full rank-ordered session

## Integration Tests
Recommended verification commands from `client/package.json`:

```powershell
cd "C:\Users\DaveByrne\Documents\RI Validation Platform\client"
npm run typecheck
npm run lint
npm run build
```

Expected result:

- Typecheck passes.
- Lint passes, or any pre-existing lint failures are clearly separated from this change.
- Build passes.

## Manual Checks

### M01 - Default Dashboard
1. Open a session dashboard.
2. Confirm Rank is still the default selected grouping.
3. Confirm alert order and status indicators match current behaviour.

Expected:
- No visible regression in the default dashboard.

### M02 - Sub-Category Grouping
1. Select `Sub-category`.
2. Confirm alerts are grouped by product sub-category.
3. Confirm each group heading shows the sub-category name and count.
4. Confirm group order is alphabetical.

Expected:
- Groups render using `Alert.subcategory`.
- Counts match the number of alerts in each group.

### M03 - Missing Sub-Category
1. Use or create a fixture/session with one alert missing sub-category.
2. Select `Sub-category`.

Expected:
- The alert appears under `Uncategorised`.
- No blank or `undefined` heading appears.

### M04 - Existing Grouping Modes
1. Select Department.
2. Select Type.
3. Select Rank.

Expected:
- Department grouping still uses `category`.
- Type grouping still uses `alert_type`.
- Rank returns to the single ungrouped/rank view.

### M05 - Capture Navigation From Sub-Category Group
1. Select `Sub-category`.
2. Open an alert inside one sub-category group.
3. Save or skip the alert.

Expected:
- Next alert navigation remains within the selected sub-category group.
- Returning to the dashboard is unchanged.

### M06 - Validation Workflow Regression
1. Save a normal validation result.
2. Skip an alert.
3. Add notes.
4. Add photos.
5. Visit Backroom where applicable.
6. Submit session.

Expected:
- Existing validation, photo, backroom, and submit behaviours remain unchanged.

## Regression Checks
- Existing Rank grouping still defaults and works.
- Existing Department grouping still works.
- Existing Type grouping still works.
- Existing capture route still works with no query params.
- Existing capture route still works with `group=department`.
- Existing capture route still works with `group=type`.
- Submit payload remains based on `session.alerts` and validation results, not grouped UI state.
- No backend files are changed.
- No API route behaviour is changed.

## Acceptance Criteria Mapping
- AC1 Dashboard shows product sub-category grouping option: M02.
- AC2 Alerts grouped by `Alert.subcategory`: M02.
- AC3 Group headings display name and count: M02.
- AC4 Missing values render under `Uncategorised`: M03.
- AC5 Rank remains default: M01.
- AC6 Department and Type still work: M04.
- AC7 Capture navigation remains scoped to selected sub-category: M05.
- AC8 Validation workflow unchanged: M06.
- AC9 No API/data-model changes: regression checks and implementation diff review.

## Stop Conditions
Stop and return to Head of Product if:

- `subcategory` is not available in a runtime session despite being present in types/models.
- Adding sub-category grouping requires backend/API changes.
- Capture navigation cannot preserve group context without broader routing changes.
- Existing validation/save/submit behaviour changes.
