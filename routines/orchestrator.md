# Quorum Phase 2 Orchestrator Routine

## Purpose

This routine runs the delivery-extension spine for a governed ticket. It creates auditable markdown artefacts, records Supabase state when available, enforces human gates, and prepares a Codex-ready implementation handoff only after approval.

## Scope

The routine may operate on tickets at these statuses:

- Submitted
- Triage
- Validation
- COE Review
- Define & Design
- Ready for Scheduling
- Scheduled

Build & Deploy and Release & GTM are out of scope.

## Pre-Action Check

Before every action:

1. Read ClickUp status.
2. Check for `closed`; if present, stop.
3. Check for `human-review-required`; if present, stop.
4. Read progress tags.
5. Read state tags.
6. Read the most recent Orchestrator comment.
7. Read Supabase run state when available.

## Delivery-Extension Workflow

1. Context Discovery
   - Read the ClickUp ticket.
   - Identify relevant docs.
   - Inspect codebase areas, API routes, data fields, tests, and related prior tickets.
   - Gather once only.

2. Context Pack
   - Write `02_context_pack.md`.
   - Store as `output_artefacts.output_type = 'context_pack'` when Supabase is live.
   - Downstream steps consume the Context Pack and do not re-fetch independently unless a human explicitly requests refresh.

3. Clarification
   - Produce `04_clarification_questions.md` when implementation-shaping information is missing.
   - Present suggested defaults separately from confirmed facts.
   - Use `[TBC - Head of Product]` where the spec is silent.

4. Requirements
   - Produce `05_requirements.md`.
   - Include acceptance criteria and explicit non-goals.
   - Preserve existing validation behaviour unless approved otherwise.

5. Solution Design
   - Produce `06_solution_design.md`.
   - Open a soft gate for solution design approval.
   - Stop until the Head of Product responds.

6. Test Plan
   - Produce `07_test_plan.md` after solution design approval.
   - Cover current behaviour, grouping behaviour, empty/missing field behaviour, and regression risk.

7. Implementation Handoff
   - Produce `09_implementation_handoff.md`.
   - Open a hard gate before implementation.
   - Codex may implement only the approved handoff.

8. ClickUp Summary
   - Produce `10_clickup_summary.md`.
   - Post only after Head of Product approval, following write-back rules.

## Gate Decision Grammar

Decisions are explicit values only. Quorum never infers a choice from tag absence, status absence, silence, or document edits.

Each gate must include:

- decision id
- gate name
- gate type
- numbered options
- AI recommendation
- rationale
- required approver

When a decision is received:

1. Record it in `08_human_decisions.md`.
2. Update `gate_decisions` when Supabase is live.
3. Append an `audit_log` event.
4. Continue only after the record exists.

## Optional Demand Signal

Demand Signal is not mandatory. It may be invoked on demand at Triage or Validation.

If it is not invoked, downstream outputs must say:

```text
No demand signal evidence assessed for this ticket.
```

If it is invoked and the overall grade is Low, the hard low-evidence gate applies.

## Closure Handling

There is no terminal ClickUp status. Closure is recorded by adding `closed` and leaving the ticket at its last live status.

If `closed` is present, stop unconditionally. Reopening requires explicit Head of Product action.

## Composable Council Rules

Where CoE Pass 2 governance applies to a delivery-triggered ticket:

1. Contrarian always runs and always closes.
2. Platform/Architecture and Engineering are mandatory for architecture, API contract, schema, data model, or platform-surface change.
3. Analyst is mandatory when demand signal was Medium/Low or evidence conflicts exist.
4. Decision Science is mandatory when the ticket touches models, thresholds, scoring, ranking, or alert logic.
5. Minimum roster size is 5 including Contrarian.

If the Head of Product requests a removal that violates a hard rule, refuse that removal, cite the rule, apply any valid parts of the edit, and re-present the roster.

Round count:

- roster of 7 or fewer: single round, Contrarian last
- roster of 8 or more: two rounds, Contrarian last
