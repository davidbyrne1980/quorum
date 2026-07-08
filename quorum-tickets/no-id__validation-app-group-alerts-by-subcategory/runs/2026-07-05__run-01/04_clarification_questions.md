# Clarification Questions

## Purpose
Capture missing implementation-shaping requirements before requirements and solution design.

## Questions
1. Which field represents sub-category in the validation app data model?
2. Is sub-category already returned by the API for each alert?
3. Should groups be expanded by default or collapsible?
4. Should alerts be sorted within each sub-category?
5. Should sub-categories be sorted alphabetically, by alert count, or by existing priority?
6. What should happen when sub-category is null, blank, or unknown?
7. Should grouping apply to all clients or only selected clients?
8. Should grouping appear only in the analyst alert list, or also in exports/results?
9. Should the group heading show alert counts?
10. Are filters, validation actions, notes, or photo capture flows affected?

## Suggested Defaults
- Use the existing sub-category field if available.
- If unavailable, identify the closest equivalent field.
- Groups expanded by default for v1.
- Group headings show sub-category name and alert count.
- Sort groups alphabetically.
- Preserve current alert order within each group.
- Null/blank values appear under `Uncategorised`.
- Apply to all clients where sub-category exists.
- Do not change exports or validation result structure unless necessary.
- Existing validation workflow must remain unchanged.

## Decision Needed
These questions are prepared for the requirements stage, but the run is currently stopped at D01. Do not proceed until the Product Manager approves the persona/workflow path.
