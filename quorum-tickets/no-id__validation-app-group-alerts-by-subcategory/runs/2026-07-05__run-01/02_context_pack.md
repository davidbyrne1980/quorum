# Context Pack

## Purpose
Shared source of truth for downstream requirements, solution design, test planning, and implementation handoff.

## Source Ticket
- Ticket title: Group validation app alerts by product sub-category.
- Ticket URL: [TBC - Product Manager]
- Live ClickUp status: Validation [TBC - Product Manager to confirm]

## Codebase Source
- Local repo path: `C:\Users\DaveByrne\Documents\RI Validation Platform`
- Branch inspected: `master`
- Commit inspected: `97d3e01`
- Working tree note: repo has untracked local files; this run inspected files read-only and made no app-code changes.

## Product / Workflow
Validation app alert review workflow.

The affected screen is the session dashboard / alert list. Individual alert capture, backroom count, photo capture, and submit flows should remain unchanged except for preserving group navigation where relevant.

## Relevant Code Areas
- `client/src/pages/Dashboard.tsx`
  - Renders the session alert list.
  - Defines `type GroupBy = 'rank' | 'department' | 'type'`.
  - Current group selector offers Rank, Department, Type.
  - Current grouped mode uses `category` for Department and `alert_type` for Type.
  - Group headings already display label and item count.
- `client/src/pages/Capture.tsx`
  - Reads `group` and `groupKey` query params.
  - Filters capture navigation by current grouping.
  - Displays `alert.category` and `alert.subcategory` in the item header.
- `client/src/pages/Backroom.tsx`
  - Displays `category` and `subcategory` for backroom items.
  - No primary grouping change identified for this ticket.
- `client/src/pages/NewSession.tsx`
  - Parses CSV column aliases `subcategory`, `sub_category`, and `subcat`.
  - Adds `subcategory` to alert objects during session import.
- `client/src/types/index.ts`
  - Frontend `Alert` interface includes `subcategory: string` and `category: string`.
- `api/models/alert.py`
  - Backend `Alert` model includes `subcategory: Optional[str] = None`.
- `api/routers/sessions.py`
  - `AlertIn` and `AlertImportRow` include `subcategory`.
  - Session creation/import writes `subcategory` to `alerts`.
  - Session fetch returns alerts from Supabase with all selected columns.

## API Routes / Queries
- `GET /sessions/{session_id}`
  - Returns a session with `alerts` fetched from Supabase `alerts` table ordered by `rank`.
- `GET /sessions`
  - Returns sessions with attached alerts fetched from Supabase `alerts` table ordered by `rank`.
- `POST /sessions`
  - Accepts alerts with `subcategory` and writes it to Supabase.
- `POST /alerts/import`
  - Accepts flat alert rows with `subcategory` and writes it to Supabase.

## Data Fields
- Exact field name: `subcategory`
- Frontend type: `Alert.subcategory`
- Backend model fields:
  - `api/models/alert.py`: `subcategory: Optional[str] = None`
  - `api/routers/sessions.py`: `AlertIn.subcategory`, `AlertImportRow.subcategory`
- CSV aliases accepted: `subcategory`, `sub_category`, `subcat`

## Existing Behaviour
- Alert list default grouping is `rank`.
- Existing alternate groupings:
  - Department = `category`
  - Type = `alert_type`
- Group headings already show counts.
- Alerts inside groups are sorted by current `sortByRank`, which places skipped alerts after active alerts and otherwise sorts by rank.
- Capture flow receives group context by query params and limits next/previous navigation to the current group.

## Existing Tests
No `*.test.*` or `*.spec.*` files were found under `client/src`.

Available verification scripts from `client/package.json`:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Data/API Reviewer Conclusion
The sub-category field already exists in the codebase and API/data flow. No data-model or API contract change is required for a UI grouping change, provided the implementation consumes `Alert.subcategory`.

Potential type/data quality nuance: backend models allow null `subcategory`, while frontend `Alert.subcategory` is typed as string. The UI grouping should defensively normalise missing, blank, or null values to `Uncategorised`.

## Recommended Implementation Surface
- Primary change: `client/src/pages/Dashboard.tsx`
- Secondary change: `client/src/pages/Capture.tsx` only if the group query-param type needs to support the new sub-category grouping.
- Test/fixture change: add or adjust validation data fixtures if a manual or automated check needs multiple subcategories and missing subcategory coverage.

## Open Questions
Most prior clarification questions are answered by code inspection or can be resolved by safe defaults:

1. Which field represents sub-category? Answered: `subcategory`.
2. Is sub-category already returned by API? Answered: yes, through session alert payloads.
3. Expanded or collapsible groups? Current UI group sections are expanded. Recommend expanded.
4. Sort within sub-category? Current grouped lists sort with `sortByRank`; recommend preserving.
5. Sort groups? Current grouped lists sort alphabetically by key. Recommend preserving.
6. Missing values? Recommend `Uncategorised`; needs implementation because current grouped logic does not explicitly normalise missing keys.
7. All clients or selected clients? Field is generic across session import/API; recommend all clients where field exists.
8. Analyst alert list or exports/results too? Code evidence points to dashboard/list only; submit/results payloads do not need grouping.
9. Show counts? Current headings already show counts. Recommend preserving.
10. Filters/actions/notes/photo capture affected? No direct change required; capture navigation should preserve group context.
