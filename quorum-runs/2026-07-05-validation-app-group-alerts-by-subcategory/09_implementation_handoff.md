# Implementation Handoff

## Decision ID
D03

## Approved Scope
Implement the approved D02 solution design for grouping validation app alerts by product sub-category.

This handoff is ready for Codex/Claude Code implementation after D03 approval.

## Product Behaviour
- Add `Sub-category` as a grouping option on the validation app session dashboard.
- Keep Rank as the default grouping.
- When `Sub-category` is selected, group alerts by `Alert.subcategory`.
- Each sub-category group heading shows the group label and alert count.
- Missing, blank, null, or whitespace-only sub-category values display as `Uncategorised`.
- Alerts inside each group use the existing rank/skipped sorting behaviour.
- Opening an alert from a sub-category group preserves group-scoped capture navigation.
- Existing Department and Type grouping remain unchanged.
- Existing validation workflow remains unchanged.

## Technical Instructions

### Repo
`C:\Users\DaveByrne\Documents\RI Validation Platform`

Inspected branch/commit:

- branch: `master`
- commit: `97d3e01`

### Files To Change
Primary:

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Capture.tsx`

Do not change backend/API files for this feature unless implementation proves the Context Pack is wrong.

### Dashboard Implementation
In `client/src/pages/Dashboard.tsx`:

1. Extend the grouping type:

```ts
type GroupBy = 'rank' | 'department' | 'subcategory' | 'type'
```

2. Add a normalisation helper near the grouping logic:

```ts
const groupLabel = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Uncategorised'
}
```

3. Update grouped key selection so:

```ts
const keyFn =
  group === 'department' ? (a: Alert) => groupLabel(a.category) :
  group === 'subcategory' ? (a: Alert) => groupLabel(a.subcategory) :
  (a: Alert) => groupLabel(a.alert_type)
```

4. Add the segmented-control button:

```tsx
<button data-on={group === 'subcategory'} onClick={() => setGroup('subcategory')} style={{ height: 40, fontSize: 14 }}>Sub-category</button>
```

5. Keep existing group heading/count rendering.

6. Keep existing `sortByRank` behaviour.

### Capture Navigation Implementation
In `client/src/pages/Capture.tsx`:

1. Extend accepted group query-param typing:

```ts
const groupBy = searchParams.get('group') as 'department' | 'subcategory' | 'type' | null
```

2. Add the same group-label normalisation helper, or a local equivalent:

```ts
const groupLabel = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'Uncategorised'
}
```

3. Update filtered navigation:

```ts
const sorted = groupBy && groupKey
  ? allSorted.filter((a) => {
      const key =
        groupBy === 'department' ? groupLabel(a.category) :
        groupBy === 'subcategory' ? groupLabel(a.subcategory) :
        groupLabel(a.alert_type)
      return key === groupKey
    })
  : allSorted
```

4. Preserve existing fallback behaviour when no group params are present.

## Files / Areas Not To Change
- `api/models/alert.py`
- `api/routers/sessions.py`
- Supabase schema/migrations
- submit flow
- validation result payload shape
- alert scoring/ranking logic
- photo capture
- backroom count workflow

## Tests Required
Run from:

```powershell
cd "C:\Users\DaveByrne\Documents\RI Validation Platform\client"
```

Commands:

```powershell
npm run typecheck
npm run lint
npm run build
```

Manual checks:

1. Rank remains default on session dashboard.
2. Sub-category grouping shows groups by `subcategory`.
3. Group headings show label and count.
4. Missing/blank values display as `Uncategorised`.
5. Department grouping still works.
6. Type grouping still works.
7. Opening an alert from a sub-category group preserves scoped next/previous navigation.
8. Save, skip, photo, backroom, and submit flows still work.

## Constraints
- Do not write to ClickUp.
- Do not write to Supabase.
- Do not change backend/API unless blocked by a discovered contradiction.
- Do not change product behaviour beyond approved grouping.
- Keep implementation small and local.
- Preserve existing styling conventions.

## Stop Conditions
Stop and report back before implementation if:

- `subcategory` is not actually present in runtime alert data.
- implementation requires backend/API changes.
- changing Capture group navigation would require broader routing changes.
- existing validation workflow would be altered.
- verification commands fail due to issues that are not clearly pre-existing.

## D03 Approval Options
1. Approve implementation handoff and allow Codex/Claude Code to implement in the RI Validation Platform repo.
2. Approve handoff with edits.
3. Request handoff changes before implementation.
4. Cancel implementation for this run.
