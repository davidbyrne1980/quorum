# Requirements

## Objective
Group validation app alerts by product sub-category so validators can scan and work through related alerts together.

## Background
The source request is: "Group validation app alerts by product sub-category."

D01 approved the simplified delivery path and requires Data/API Reviewer involvement from the start. Context Discovery has now inspected the local RI Validation Platform codebase.

Key findings:

- The frontend `Alert` type already includes `subcategory`.
- Backend alert/session models already include `subcategory`.
- CSV import already maps `subcategory`, `sub_category`, and `subcat`.
- The session dashboard already supports grouping by rank, department/category, and type.
- Group headings already show item counts.
- No API contract or data-model change is required for grouping by `subcategory`.

## In Scope
- Add product sub-category as an alert-list grouping option.
- Use existing `Alert.subcategory` as the grouping field.
- Preserve the current default grouping by rank unless Head of Product decides otherwise.
- Keep groups expanded by default, matching current group rendering.
- Show group heading label and alert count, matching current grouped modes.
- Sort sub-category groups alphabetically, matching current grouped modes.
- Preserve current alert ordering within each group via existing rank/skipped sorting.
- Normalise null, blank, or missing sub-category values to `Uncategorised`.
- Preserve group context when navigating from dashboard to capture screen.

## Out of Scope
- API contract changes.
- Data-model changes.
- Export/results grouping changes.
- Alert scoring, threshold, ranking, or generation changes.
- Capture form behaviour changes beyond preserving group navigation context.
- Backroom workflow changes.
- Photo capture, notes, validation action, and submit-flow changes.

## Functional Requirements

### FR1 - Add Sub-Category Grouping Option
The dashboard grouping control must include a product sub-category option.

Evidence:
- `client/src/pages/Dashboard.tsx` currently defines `GroupBy = 'rank' | 'department' | 'type'`.
- The control currently renders Rank, Department, and Type buttons.

### FR2 - Group By `Alert.subcategory`
When sub-category grouping is selected, dashboard alerts must be grouped by `alert.subcategory`.

Evidence:
- `client/src/types/index.ts` defines `Alert.subcategory`.
- `api/models/alert.py` and `api/routers/sessions.py` include `subcategory`.

### FR3 - Preserve Default Rank View
The dashboard should continue to default to rank grouping.

Rationale:
- Current `Dashboard.tsx` initialises grouping with `useState<GroupBy>('rank')`.
- The ticket asks for grouping capability, not a forced default change.

### FR4 - Preserve Current Group Heading Pattern
Sub-category groups must use the existing grouped-section pattern: label plus count.

Evidence:
- `Dashboard.tsx` already renders group headings with label and item count for non-rank groups.

### FR5 - Missing Values
Alerts with null, blank, or missing `subcategory` must appear under `Uncategorised`.

Rationale:
- Backend models allow optional `subcategory`.
- Frontend type currently treats `subcategory` as string, so implementation should still be defensive.

### FR6 - Sorting
Sub-category group labels should sort alphabetically. Alerts within each group should use the existing `sortByRank` behaviour.

Evidence:
- Current grouped modes sort group keys alphabetically.
- Current `sortByRank` preserves rank order while moving skipped alerts after active alerts.

### FR7 - Capture Navigation Context
When a validator opens an alert from a sub-category group, capture next/previous navigation should stay within that selected sub-category group.

Evidence:
- `Capture.tsx` already reads `group` and `groupKey` query params and filters navigation for department/type grouping.

### FR8 - Workflow Preservation
Validation actions, notes, photo capture, backroom counting, result submission, and submit review must continue to work unchanged.

Evidence:
- The grouping change can be limited to dashboard grouping and capture group-param support.
- `Submit.tsx` builds results from `session.alerts` and does not need grouped data.

## Acceptance Criteria
- Dashboard shows a product sub-category grouping option.
- Selecting product sub-category groups alerts by `Alert.subcategory`.
- Each group heading displays the sub-category name and count.
- Alerts missing sub-category appear under `Uncategorised`.
- Rank remains the default dashboard grouping.
- Existing Department and Type grouping still work.
- Opening an alert from a sub-category group preserves group-scoped capture navigation.
- Existing validation actions, notes, photo capture, backroom flow, and submit flow are unchanged.
- No API or data-model changes are made.
- Typecheck/build/lint are run or explicitly reported if unavailable.

## Non-Functional Requirements
- Keep implementation small and local to the dashboard/capture grouping path.
- Do not mutate alert records during grouping.
- Keep grouping deterministic.
- Avoid duplicating alerts in the rendered list.
- Avoid adding a new dependency.

## Risks / Open Questions
- UI copy for the new grouping button: recommend `Sub-category`.
- Query-param value naming: recommend `subcategory`.
- The current frontend type says `subcategory: string`, but backend allows null. Implementation should still normalise defensively.
- No automated tests were found under `client/src`; verification may rely on typecheck/build/lint and manual UI checks unless tests are added.
