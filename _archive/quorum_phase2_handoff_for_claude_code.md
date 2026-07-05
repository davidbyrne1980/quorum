# Quorum Phase 2 Handoff: Claude Planning, Codex Build
> **Status note (05 Jul 2026):** This document originated outside the Quorum canonical set. The named agents "Odyseus" and "Hermes" are NOT adopted — their responsibilities are implemented as Orchestrator workflow steps ("Context Discovery" and "Gate & Comms handling" respectively), built in-house. The six-table quorum_* schema in §9 is superseded by SUPABASE_SCHEMA.md v5 (merged). The retained concepts are: run folders, the Context Pack, versioned outputs, explicit decision records, the validation-app test case, and the "What To Avoid" list.


**Purpose:** This document distils the last four Quorum-related conversations into a single implementation handoff for Claude Code.  
**Intended use:** Paste this into Claude Code or include it in the repo as a planning artefact.  
**Explicit exclusion:** Ignore the Celtic FC conversation content in `4.txt`. It is unrelated noise.

---

## 1. Executive Summary

Quorum Phase 2 should prove that an AI-assisted product delivery workflow can take a real ClickUp ticket and produce a safe, auditable, developer-ready implementation plan.

The first test case should be deliberately small:

> **Validation app change:** group validation alerts by product sub-category.

The feature itself is not the main test. The main test is whether Quorum can reliably move from:

1. ClickUp ticket
2. Context discovery
3. Product triage
4. Clarification
5. Requirements
6. Codebase-aware solution design
7. Test plan
8. Human approval
9. Claude/Codex-ready implementation handoff
10. Audit trail

The core principle is:

> **Claude should do most of the planning and design. Codex should do most of the implementation. Quorum should control the workflow, context, approvals, and audit.**

Quorum should not become a loose set of agents producing disconnected markdown. It needs a clear operating model, stable run structure, human-in-the-loop gates, and a durable audit/state store.

---

## 2. What We Are Trying To Build

Quorum is a governance and orchestration system for product decisioning and delivery preparation.

It should help Dave/Product take ambiguous product asks and turn them into structured, evidence-backed implementation instructions.

For Phase 2, Quorum should focus on:

- Reading a ClickUp ticket.
- Gathering context from the codebase and docs.
- Producing a structured context pack.
- Asking implementation-shaping clarification questions.
- Recommending whether a full council or lightweight path is needed.
- Pausing for human approval at key gates.
- Producing a solution design document.
- Producing a test plan.
- Producing a Claude/Codex handoff markdown file.
- Recording every meaningful action, output, and human decision in an audit trail.

The target is not autonomy. The target is controlled acceleration.

---

## 3. Design Principles

### 3.1 Quorum is the workflow, not the model

Claude, Codex, and any other agent are replaceable execution engines. Quorum should define:

- What happens next.
- Which context is required.
- Which agent/routine runs.
- When a human decision is needed.
- What artefacts are produced.
- Where the output is written.
- What gets recorded in the audit trail.

### 3.2 Context should be gathered once and reused

Avoid every agent independently searching ClickUp, the codebase, docs, Slack, or databases.

Instead:

1. A discovery step creates a **Context Pack**.
2. That pack is saved as a run artefact.
3. Downstream agents consume the same context pack.
4. If context is missing, the orchestrator requests more discovery.

This prevents duplicated work, inconsistent evidence, and hallucinated assumptions.

### 3.3 Markdown is the human-readable artefact; Supabase is the audit/state store

Markdown files are ideal for:

- Claude Code consumption.
- Codex handoff.
- PR descriptions.
- Human review.
- Git versioning.

Supabase is ideal for:

- Current workflow state.
- Agent run records.
- Human decisions.
- Approval inbox.
- Immutable event timeline.
- Auditability across tickets.

Use both. Do not treat terminal logs or chat history as the system of record.

### 3.4 Human-in-the-loop is a first-class workflow concept

Quorum must pause before major decisions and record:

- What the agent recommended.
- Why it recommended it.
- What options the human saw.
- What the human decided.
- Who decided.
- When.
- What happened next.

This is especially important before:

- Selecting council/personas.
- Finalising requirements.
- Finalising solution design.
- Handing work to Codex.
- Posting back to ClickUp.
- Allowing code changes.

### 3.5 Start narrow, but design the spine properly

The first test should not attempt the full long-term Quorum vision.

For the validation app grouping change, build only the minimum robust spine:

- ClickUp ticket intake.
- Run folder.
- Context pack.
- Clarification questions.
- Requirements.
- Persona/council recommendation.
- Human decision gate.
- Solution design.
- Test plan.
- Implementation handoff.
- Audit record.

Do not start with a full custom UI unless absolutely necessary. A React app becomes useful once approval inboxes and audit views matter across multiple tickets.

---

## 4. Target Phase 2 Test Case

### 4.1 ClickUp Ticket

**Title:** Group validation app alerts by sub-category

**Suggested description:**

> In the internal validation app, analysts currently see a flat list of alerts for a selected client/store/action type. I want the alerts grouped by product sub-category so analysts can review related alerts together.
>
> This should make store validation easier by helping users work through similar products in batches rather than jumping between unrelated items.
>
> Initial expectation:
>
> - Alerts should be visually grouped by sub-category.
> - Each group should show the sub-category name.
> - Each group should show the number of alerts in that group.
> - Alerts with no sub-category should still be visible.
> - The existing validation workflow should continue to work as it does today.
> - Existing alert-level information should not be removed.
>
> Please triage, clarify requirements, assess whether this is frontend-only or requires API/data changes, inspect the codebase, and produce an implementation plan for Claude Code/Codex.

Do not over-specify the ticket. The point is to let Quorum discover missing requirements.

### 4.2 Success Criteria For The Quorum Test

Quorum succeeds if it can produce an artefact that answers:

- What is being asked for?
- Why does it matter?
- Which screen/workflow is affected?
- Which field represents sub-category?
- Is that field already available in the API/frontend model?
- Which components render the alert list?
- Which API routes or data queries provide alerts?
- Which tests need to change?
- What are the edge cases?
- What exact implementation steps should Codex follow?
- Which human approvals were captured?
- What was written to the audit trail?

---

## 5. Recommended Architecture

### 5.1 Component Roles

| Component | Role |
|---|---|
| **Quorum Orchestrator** | Controls the run, determines next stage, chooses workflow path, opens/closes gates. |
| **the Context Discovery step** | Discovery/context agent. Explores ClickUp, docs, codebase, schema, app behaviour, prior related tickets. Produces the Context Pack. |
| **Specialist Agents / Routines** | Intake, requirements, solution design, test planning, implementation handoff, review. |
| **the Gate & Comms layer** | Communication, routing, approval requests, response capture, notifications, ClickUp comments. |
| **Supabase** | Workflow state, approval inbox, audit ledger, agent run records, generated outputs. |
| **Markdown run folder** | Human-readable and Claude/Codex-readable artefacts. |
| **ClickUp** | Source ticket and operational update surface. |
| **Claude Code** | Planning, orchestration, codebase inspection, design artefact generation. |
| **Codex** | Implementation against the approved handoff. |

### 5.2 the Context Discovery step: Context Discovery

the Context Discovery step should answer:

> “Where does this change actually touch the system?”

For the validation app grouping change, the Context Discovery step should inspect:

- ClickUp ticket title, description, comments, status.
- Product docs for validation app behaviour.
- React components for alert list rendering.
- API routes returning alerts.
- Type/interface definitions for alert objects.
- Mock data and fixtures.
- Existing tests.
- Snowflake/Supabase schema if relevant.
- Screenshots or running app if accessible.
- Prior related tickets or docs.

the Context Discovery step output should be saved as:

```text
/quorum-runs/{run_slug}/02_context_pack.md
```

The Context Pack should include:

```markdown
# Context Pack

## Ticket Summary
## Current Product Behaviour
## Relevant Product Docs
## Relevant Codebase Areas
## Relevant API Routes
## Relevant Data Fields
## Relevant Tests
## Similar Prior Tickets
## Known Risks
## Open Questions
## Confidence
## Recommended Next Investigation
```

### 5.3 the Gate & Comms layer: Human Approval and Workflow Messaging

the Gate & Comms layer should answer:

> “Who needs to review this, where should they be asked, what exactly are they approving, and what should happen after they respond?”

the Gate & Comms layer owns:

- Approval request creation.
- Pending approval list.
- Human response capture.
- Routing to Dave/Product/Engineering/DS/QA/CS where needed.
- ClickUp summary comments.
- Slack/email/app notification later if required.
- Writing decision outcomes to Supabase.
- Triggering the next stage after approval.

Example approval mapping:

```json
{
  "approval_request_id": "approval_001",
  "ticket_id": "CU-12345",
  "run_id": "run_001",
  "decision_type": "persona_selection",
  "prompt": "Approve simplified council for this validation app UI/API change?",
  "options": [
    "Approve recommended simplified path",
    "Use full council",
    "Add DS reviewer",
    "Reject and revise"
  ],
  "status": "pending"
}
```

If Dave replies `1 approve`, the Gate & Comms layer should resolve it to the correct pending approval and record the response.

---

## 6. Recommended End-to-End Workflow

```text
ClickUp ticket moved to Ready for Quorum
        ↓
Quorum run created
        ↓
the Context Discovery step context discovery
        ↓
Context Pack created
        ↓
Intake / Clarification Agent
        ↓
Requirements Agent
        ↓
Orchestrator recommends council/workflow path
        ↓
Human approval gate: persona/workflow path
        ↓
Solution Design Agent
        ↓
Human approval gate: solution design
        ↓
Test Plan Agent
        ↓
Implementation Handoff Agent
        ↓
Human approval gate: handoff to Codex
        ↓
Codex implementation
        ↓
Review Agent checks implementation against requirements
        ↓
ClickUp updated
        ↓
Run completed
```

For Phase 2, this can happen mostly inside Claude Code, with markdown files and Supabase audit records.

---

## 7. Run Folder Structure

Each Quorum run should create a deterministic folder.

Example:

```text
/quorum-runs/
  /2026-07-04-cu-12345-group-alerts-by-subcategory/
    00_run_manifest.md
    01_ticket_intake.md
    02_context_pack.md
    03_persona_recommendation.md
    04_clarification_questions.md
    05_requirements.md
    06_solution_design.md
    07_test_plan.md
    08_human_decisions.md
    09_implementation_handoff.md
    10_clickup_summary.md
```

### 7.1 `00_run_manifest.md`

Purpose: index and current run status.

Should include:

```markdown
# Quorum Run Manifest

## Run ID
## Source Ticket
## Objective
## Current Status
## Current Stage
## Current Gate
## Created At
## Triggered By
## Output Files
## Human Decisions
## Links
```

### 7.2 `01_ticket_intake.md`

Purpose: clean extraction of the ClickUp ask.

Should include:

```markdown
# Ticket Intake

## Ticket Title
## Ticket URL
## Raw Request
## Product Area
## User / Persona
## Problem Statement
## Initial Interpretation
## Assumptions
## Missing Information
## Recommended Next Step
```

### 7.3 `02_context_pack.md`

Purpose: shared source of truth for downstream agents.

See the Context Discovery step section.

### 7.4 `03_persona_recommendation.md`

Purpose: orchestrator recommendation on which personas/routines are required.

For the validation app grouping test, the likely recommendation is a simplified path:

- Product Intake
- Solution Designer
- Engineering Reviewer
- QA/Test Reviewer
- Data/API Reviewer only if sub-category is missing from the API payload

Avoid a full 13-persona council for a narrow UI/API change unless the discovery stage finds cross-client, commercial, privacy, architecture, or client-facing implications.

### 7.5 `04_clarification_questions.md`

Purpose: capture missing implementation-shaping requirements.

For the grouping change, questions should include:

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

Suggested default answers for the first test:

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

### 7.6 `05_requirements.md`

Purpose: product requirement with acceptance criteria.

Should include:

```markdown
# Requirements

## Problem
## User
## Desired Behaviour
## Non-Goals
## Acceptance Criteria
## Dependencies
## Edge Cases
## Human Approval Status
```

### 7.7 `06_solution_design.md`

Purpose: codebase-aware solution design.

Should include:

```markdown
# Solution Design

## Summary
## Current Behaviour
## Desired Behaviour
## Codebase Findings
## Data Requirements
## Proposed Technical Approach
## Frontend Changes
## API Changes
## Database Changes
## Test Impact
## Risks
## Rollback / Reversal
## Open Questions
```

### 7.8 `07_test_plan.md`

Purpose: specific automated/manual test impact.

Should include:

```markdown
# Test Plan

## Unit Tests
## Component Tests
## API Tests
## Integration Tests
## Manual QA
## Regression Risks
## Test Data Needed
```

### 7.9 `08_human_decisions.md`

Purpose: durable record of all approvals/rejections/modifications.

Should include:

```markdown
# Human Decisions

## Decision Log

### D01 - Persona / Workflow Path
- Status:
- Recommendation:
- Options Presented:
- Human Response:
- Decided By:
- Decided At:
- Consequence:

### D02 - Requirements Approval
...

### D03 - Solution Design Approval
...

### D04 - Implementation Handoff Approval
...
```

### 7.10 `09_implementation_handoff.md`

Purpose: the key Claude/Codex input.

This should be the file Codex uses to build.

Should include:

```markdown
# Implementation Handoff

## Objective
## Approved Requirements
## Approved Technical Approach
## Files To Inspect
## Files Likely To Change
## Exact Implementation Steps
## Test Steps
## Constraints
## Do Not Change
## Edge Cases
## Acceptance Criteria
## Suggested Commit Message
## Human Approval Reference
```

---

## 8. Human-in-the-Loop Protocol

Add this to `QUORUM.md` or `CLAUDE.md`.

```markdown
## Human-in-the-loop protocol

When a routine reaches a decision point, do not continue automatically.

Instead:

1. Write the decision request to the active run folder.
2. Create or update the corresponding Supabase decision record.
3. Summarise the decision required in Claude Code chat.
4. Present clear numbered options.
5. Wait for explicit human approval, rejection, or modification.
6. Record the decision in `08_human_decisions.md`.
7. Update the Supabase decision record.
8. Insert an immutable audit event.
9. Continue only after approval or explicit modification.

Every decision request must include:

- Decision ID
- Gate name
- Context
- Agent recommendation
- Rationale
- Options
- Risks / trade-offs
- Default recommendation
```

Recommended approval gates:

1. Persona/workflow path approval.
2. Requirements approval.
3. Solution design approval.
4. Test plan approval.
5. ClickUp update approval.
6. Implementation handoff approval.
7. Code modification approval.

For Phase 2, use at least these gates:

- Persona/workflow path approval.
- Solution design approval.
- Implementation handoff approval.

---

## 9. Supabase Audit and State Model

Supabase should be the structured workflow state and audit database.

Minimum viable tables:

1. `quorum_tickets`
2. `quorum_runs`
3. `quorum_agent_runs`
4. `quorum_outputs`
5. `quorum_decisions`
6. `quorum_events`

Do not go below these six if auditability matters.

### 9.1 `quorum_tickets`

One row per ClickUp ticket known to Quorum.

```sql
create table quorum_tickets (
  id uuid primary key default gen_random_uuid(),

  external_system text not null default 'clickup',
  external_ticket_id text not null,
  external_ticket_url text,
  title text not null,

  client_name text,
  product_area text,
  source_status text,

  current_quorum_status text not null default 'not_started',
  current_run_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (external_system, external_ticket_id)
);
```

Suggested statuses:

- `not_started`
- `queued`
- `running`
- `awaiting_human`
- `blocked`
- `ready_for_implementation`
- `implemented`
- `completed`
- `cancelled`
- `failed`

### 9.2 `quorum_runs`

One ticket can have multiple Quorum runs.

```sql
create table quorum_runs (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null references quorum_tickets(id) on delete cascade,

  run_number int not null,
  run_slug text not null,

  objective text,
  trigger_type text not null,
  triggered_by text,

  status text not null default 'running',
  current_stage text,
  current_gate_id uuid,

  repo_branch text,
  run_folder_path text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ticket_id, run_number)
);
```

Trigger types:

- `manual_claude_code`
- `manual_react_app`
- `clickup_status_change`
- `scheduled_batch`
- `rerun`
- `resume_after_human_decision`

### 9.3 `quorum_agent_runs`

Tracks each individual agent/routine.

```sql
create table quorum_agent_runs (
  id uuid primary key default gen_random_uuid(),

  run_id uuid not null references quorum_runs(id) on delete cascade,
  ticket_id uuid not null references quorum_tickets(id) on delete cascade,

  agent_name text not null,
  agent_version text,
  routine_name text,

  status text not null default 'started',

  input_summary text,
  output_summary text,

  model_provider text,
  model_name text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  error_message text,
  error_details jsonb,

  metadata jsonb not null default '{}'::jsonb
);
```

Statuses:

- `started`
- `completed`
- `failed`
- `skipped`
- `cancelled`
- `awaiting_human`

### 9.4 `quorum_outputs`

Stores generated artefacts, with optional markdown and file path.

```sql
create table quorum_outputs (
  id uuid primary key default gen_random_uuid(),

  run_id uuid not null references quorum_runs(id) on delete cascade,
  ticket_id uuid not null references quorum_tickets(id) on delete cascade,
  agent_run_id uuid references quorum_agent_runs(id) on delete set null,

  output_type text not null,
  title text not null,

  content_markdown text,
  content_json jsonb,

  file_path text,
  version int not null default 1,

  is_current boolean not null default true,

  created_by text not null default 'agent',
  created_at timestamptz not null default now()
);
```

Output types:

- `ticket_intake`
- `context_pack`
- `persona_recommendation`
- `clarification_questions`
- `requirements`
- `solution_design`
- `test_plan`
- `implementation_handoff`
- `clickup_summary`
- `risk_assessment`
- `decision_prompt`

Important: outputs should be versioned. Do not overwrite meaningful generated artefacts without retaining prior versions.

### 9.5 `quorum_decisions`

Most important table for human-in-the-loop.

```sql
create table quorum_decisions (
  id uuid primary key default gen_random_uuid(),

  run_id uuid not null references quorum_runs(id) on delete cascade,
  ticket_id uuid not null references quorum_tickets(id) on delete cascade,

  decision_code text not null,
  gate_name text not null,
  gate_sequence int not null,

  status text not null default 'pending',

  decision_type text not null,

  prompt_markdown text not null,
  recommendation text,
  rationale text,
  options jsonb not null default '[]'::jsonb,

  selected_option text,
  human_response text,
  human_response_source text,

  requested_by_agent_run_id uuid references quorum_agent_runs(id) on delete set null,
  decided_by text,
  decided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (run_id, decision_code)
);
```

Decision statuses:

- `pending`
- `approved`
- `modified`
- `rejected`
- `cancelled`
- `expired`
- `superseded`

Decision types:

- `persona_selection`
- `clarification_approval`
- `requirements_approval`
- `solution_design_approval`
- `test_plan_approval`
- `clickup_update_approval`
- `implementation_handoff_approval`
- `implementation_start_approval`

Human response sources:

- `react_app`
- `claude_code_chat`
- `clickup_comment`
- `slack`
- `manual_admin`

### 9.6 `quorum_events`

Immutable audit log.

```sql
create table quorum_events (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid references quorum_tickets(id) on delete cascade,
  run_id uuid references quorum_runs(id) on delete cascade,
  agent_run_id uuid references quorum_agent_runs(id) on delete set null,
  decision_id uuid references quorum_decisions(id) on delete set null,
  output_id uuid references quorum_outputs(id) on delete set null,

  event_type text not null,
  actor_type text not null,
  actor_name text,

  summary text not null,
  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);
```

Actor types:

- `human`
- `agent`
- `system`
- `external_tool`

Event types:

- `ticket_registered`
- `run_created`
- `run_started`
- `run_completed`
- `run_failed`
- `agent_started`
- `agent_completed`
- `agent_failed`
- `output_created`
- `output_revised`
- `decision_requested`
- `decision_approved`
- `decision_modified`
- `decision_rejected`
- `gate_opened`
- `gate_closed`
- `clickup_comment_posted`
- `handoff_created`
- `implementation_started`
- `implementation_completed`

Rule:

> Treat `quorum_events` as append-only. Do not update or delete audit events except for exceptional admin repair.

---

## 10. React App Scope

Do not build the React app first unless needed.

Phase 2 can run via:

- Claude Code chat for interaction.
- Markdown files for artefacts.
- Supabase for audit/state.
- ClickUp for operational summaries.

The React app becomes valuable when you want:

- Approval inbox.
- Ticket/run dashboard.
- Audit timeline.
- Output viewer.
- Human decision capture outside Claude Code.
- Multiple Quorum runs across multiple tickets.

### 10.1 Future React App Screens

| Screen | Purpose |
|---|---|
| Dashboard | Shows active Quorum tickets and statuses. |
| Approval Inbox | Shows pending human decisions. |
| Ticket Detail | Shows current Quorum status for one ticket. |
| Run Detail | Shows artefacts, stages, agent runs, current gate. |
| Audit Timeline | Shows immutable event history. |
| Outputs | Shows generated markdown artefacts. |
| Agent Runs | Shows which agents ran, status, summaries, errors. |

### 10.2 Approval Inbox Query

```sql
select *
from quorum_decisions
where status = 'pending'
order by created_at;
```

### 10.3 Ticket Audit Query

```sql
select created_at, actor_type, actor_name, event_type, summary
from quorum_events
where ticket_id = '<ticket_id>'
order by created_at;
```

---

## 11. Validation App Feature: Desired Behaviour

For the first test, the target behaviour should be:

- Alert list renders alerts grouped by product sub-category.
- Each group has a visible heading.
- Heading shows sub-category name.
- Heading shows alert count.
- Groups are expanded by default in v1.
- Groups are sorted alphabetically.
- Alerts within each group preserve the existing alert order.
- Missing, null, blank, or whitespace-only sub-category values appear under `Uncategorised`.
- Existing filters should continue to apply before grouping unless codebase inspection shows post-filter grouping is safer.
- Existing validation actions must remain unaffected.
- Photo upload, notes, validation result submission, and alert-level state must continue to use stable alert IDs, not array index.
- No export or validation result schema changes unless the existing architecture requires it.

---

## 12. Data Field Discovery Rules

Do not invent the field name.

The Solution Design Agent must inspect the codebase/API/model for fields such as:

- `subCategory`
- `subcategory`
- `sub_category`
- `productSubCategory`
- `product_sub_category`
- `category`
- `department`
- `department_group`
- `class`
- `commodity_group`

If no suitable field exists:

1. Identify the alert retrieval API route/query.
2. Identify whether the source data contains sub-category.
3. Recommend the minimum backend/API/data change.
4. Update type/interface definitions.
5. Update mock data.
6. Add API tests if backend changes are made.

---

## 13. Technical Approach For The Validation App Change

Preferred v1 approach:

1. Keep it frontend-only if the alert payload already contains sub-category.
2. Add a small grouping helper function.
3. Keep grouping logic separate from rendering.
4. Avoid changing validation result submission.
5. Avoid backend/API changes unless the sub-category field is absent.
6. Avoid changing sorting semantics inside groups.
7. Preserve alert IDs and existing validation state management.

Conceptual grouping utility:

```ts
type GroupedAlerts<TAlert> = {
  subCategory: string;
  alerts: TAlert[];
};

function normaliseSubCategory(value: unknown): string {
  if (typeof value !== "string") return "Uncategorised";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Uncategorised";
}

function groupAlertsBySubCategory<TAlert>(
  alerts: TAlert[],
  getSubCategory: (alert: TAlert) => unknown
): GroupedAlerts<TAlert>[] {
  const groups = new Map<string, TAlert[]>();

  for (const alert of alerts) {
    const key = normaliseSubCategory(getSubCategory(alert));
    const existing = groups.get(key) ?? [];
    existing.push(alert);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "Uncategorised") return 1;
      if (b === "Uncategorised") return -1;
      return a.localeCompare(b);
    })
    .map(([subCategory, groupedAlerts]) => ({
      subCategory,
      alerts: groupedAlerts,
    }));
}
```

Codex should adapt this to the actual type names, file structure, and field names found in the codebase.

---

## 14. Test Plan For The Validation App Change

### 14.1 Unit Tests

Add tests for the grouping helper:

- Groups alerts by sub-category.
- Preserves alert order within each group.
- Handles null sub-category.
- Handles missing sub-category.
- Handles empty string.
- Handles whitespace-only string.
- Sorts groups alphabetically.
- Places `Uncategorised` last if implemented.
- Handles empty alert array.

### 14.2 Component Tests

Add/update alert list rendering tests:

- Renders group headings.
- Renders alert count per group.
- Renders `Uncategorised` group.
- Existing alert card/row content still appears.
- Existing validation controls still appear.
- Existing filters still work.
- Existing validation actions remain associated with the correct alert ID.

### 14.3 API Tests

Only required if backend/API changes are needed:

- Alert response includes sub-category field.
- Missing sub-category does not break response.
- Existing response fields remain unchanged.

### 14.4 Manual QA

In the running app:

1. Select a client/store/action type with multiple sub-categories.
2. Confirm grouped rendering.
3. Confirm group counts.
4. Confirm uncategorised handling.
5. Submit a validation result.
6. Add notes if supported.
7. Add/upload photo if supported.
8. Confirm filtering/search still works.
9. Confirm save/navigation still works.
10. Confirm no regression in current workflow.

---

## 15. Claude/Codex Division of Labour

### 15.1 Claude Code Should Own

- Understanding the ClickUp ticket.
- Inspecting the codebase.
- Producing the Context Pack.
- Asking clarification questions.
- Recommending workflow/persona path.
- Writing requirements.
- Writing solution design.
- Writing test plan.
- Writing implementation handoff.
- Capturing human approval.
- Creating/maintaining Quorum run artefacts.
- Updating Supabase audit/state if wired.
- Summarising back to ClickUp.

### 15.2 Codex Should Own

- Implementing approved code changes.
- Following `09_implementation_handoff.md`.
- Making minimal, targeted code edits.
- Adding tests specified in the handoff.
- Running test/build commands where available.
- Reporting changed files.
- Reporting deviations from the handoff.
- Not expanding scope without returning to Quorum/Claude for approval.

### 15.3 Critical Boundary

Codex should not re-decide the product behaviour unless it finds a blocking technical constraint.

If Codex finds a major issue, it should stop and report:

- What assumption failed.
- Which file/logic caused the issue.
- What options exist.
- Which option it recommends.
- Whether human approval is required.

---

## 16. Prompt For Claude Code: Master Quorum Phase 2 Planning Prompt

Use this prompt in Claude Code.

```text
You are acting as Quorum Phase 2 Orchestrator and Solution Design Lead.

Goal:
Use the provided ClickUp ticket and the validation app codebase to produce a controlled, auditable, Claude/Codex-ready implementation plan.

Operating rules:
- Do not modify production code until the implementation handoff has been approved.
- Create a run folder under /quorum-runs/{date-ticket-slug}/.
- Use markdown artefacts as the human-readable system of record.
- If Supabase audit tables are available, write ticket/run/agent/output/decision/event records.
- Do not rely on terminal logs as the audit trail.
- Pause at human approval gates.
- Record human decisions in 08_human_decisions.md.
- Do not invent field names, file paths, APIs, or data model details. Inspect the codebase first.
- Prefer a lightweight council for narrow UI/API changes unless discovery shows broader risk.
- Produce a Codex-ready implementation handoff.

Ticket:
[PASTE CLICKUP TICKET OR LINK HERE]

Initial feature request:
Group validation app alerts by product sub-category.

Required artefacts:
1. 00_run_manifest.md
2. 01_ticket_intake.md
3. 02_context_pack.md
4. 03_persona_recommendation.md
5. 04_clarification_questions.md
6. 05_requirements.md
7. 06_solution_design.md
8. 07_test_plan.md
9. 08_human_decisions.md
10. 09_implementation_handoff.md
11. 10_clickup_summary.md

Process:
1. Register the run.
2. Read the ticket.
3. Inspect the validation app codebase.
4. Identify the alert list rendering component.
5. Identify alert type/interface/model definitions.
6. Identify the API route/query/mock data that supplies alerts.
7. Confirm whether a sub-category field exists and record the exact field name.
8. Identify relevant tests.
9. Produce the Context Pack.
10. Produce clarification questions and suggested default answers.
11. Recommend whether this needs a full council or simplified path.
12. Pause for human approval of the workflow path.
13. Produce requirements.
14. Produce solution design.
15. Pause for human approval of the solution design.
16. Produce test plan.
17. Produce Codex-ready implementation handoff.
18. Pause for human approval before implementation.
19. Produce ClickUp summary.

For every decision gate, provide:
- Decision ID
- Recommendation
- Rationale
- Options
- Risks
- Default option

Expected default behaviour for this feature:
- Use existing sub-category field if available.
- Groups expanded by default.
- Group heading shows sub-category name and alert count.
- Groups sorted alphabetically.
- Existing alert order preserved within groups.
- Missing/blank values under "Uncategorised".
- Existing validation workflow unchanged.
- No export/result schema changes unless necessary.
```

---

## 17. Prompt For Codex: Implementation Prompt

Use this only after Quorum/Claude has produced and Dave has approved `09_implementation_handoff.md`.

```text
You are Codex acting as implementation engineer.

Use the approved Quorum implementation handoff at:

/quorum-runs/{run_slug}/09_implementation_handoff.md

Your task:
Implement the approved validation app change to group alerts by product sub-category.

Rules:
- Follow the handoff exactly.
- Make the smallest safe code change.
- Do not change product behaviour beyond the approved acceptance criteria.
- Do not invent data fields. Use the exact field confirmed in the handoff.
- Preserve existing validation workflow.
- Preserve existing alert-level details.
- Preserve validation result submission behaviour.
- Preserve photo/notes behaviour if present.
- Preserve existing alert order within each sub-category group.
- Add or update tests specified in the handoff.
- If the implementation requires a deviation from the handoff, stop and report the issue instead of improvising.
- After implementation, provide:
  - changed files
  - summary of changes
  - tests added/updated
  - commands run
  - test results
  - risks or unresolved issues
```

---

## 18. ClickUp Summary Template

Quorum should post a clean operational summary back to ClickUp, not every internal artefact.

```markdown
## Quorum Output

### Recommendation
Proceed with the approved implementation path for grouping validation app alerts by sub-category.

### Product Behaviour
Alerts should be grouped by product sub-category, with each group showing name and count. Missing values should appear under `Uncategorised`. Existing validation workflow should remain unchanged.

### Technical Summary
[Summarise whether this is frontend-only or requires API/data changes based on codebase inspection.]

### Files / Areas Identified
- [file/path]
- [file/path]
- [file/path]

### Acceptance Criteria
- [criterion]
- [criterion]
- [criterion]

### Test Impact
- [unit tests]
- [component tests]
- [API tests if needed]
- [manual QA]

### Human Decisions
- [D01]
- [D02]
- [D03]

### Full Artefact
`/quorum-runs/{run_slug}/09_implementation_handoff.md`
```

---

## 19. Obsidian / Knowledgebase / Auto-Research Implications

The Obsidian and auto-research conversation matters because it defines Quorum’s long-term knowledge model.

The key distinction:

| Layer | Purpose |
|---|---|
| **Obsidian** | Dave’s curated product judgement: claims, beliefs, decision records, client patterns, product principles. |
| **LLM knowledgebase** | Evidence retrieval across ClickUp, Slack, Confluence, HubSpot, transcripts, docs. |
| **Quorum** | Structured reasoning council and workflow engine. |
| **Auto-research loop** | Iterative improvement: hypothesis, evidence, contradiction, critique, revision, confidence. |

Long-term Quorum should not rely only on generic personas. It should use:

1. Evidence layer: source-backed retrieval.
2. Belief layer: curated product principles and claim cards.
3. Research loop layer: challenge, refine, and improve recommendations.

For Phase 2, this can be simplified:

- Create a small `product-context/validation-app-product-context.md`.
- Optionally create a `product-principles.md`.
- Give Claude these files as context.
- Do not build a full organisational RAG system yet.

Recommended future note types:

- Claim card.
- Decision record.
- Client pattern.
- Initiative brief.
- Agent brief.
- Product principle.

---

## 20. Phase 2 MVP Build Order

### Step 1: Repo instructions

Create or update:

```text
CLAUDE.md
QUORUM.md
/routines/orchestrator.md
/templates/human_decision.md
/templates/run_manifest.md
/templates/context_pack.md
/templates/implementation_handoff.md
```

### Step 2: Run folder generation

Ensure Claude can create:

```text
/quorum-runs/{run_slug}/
```

with all required markdown artefacts.

### Step 3: Manual ClickUp input

For first test, do not overbuild ClickUp automation.

Manual is acceptable:

- Paste ticket text into Claude.
- Or provide ticket link if Claude has ClickUp access.

### Step 4: Codebase discovery

Claude inspects validation app files and writes `02_context_pack.md`.

### Step 5: Approval gates

Claude writes pending decisions to markdown and waits for Dave.

### Step 6: Supabase audit skeleton

Create the six core tables.

If full integration is too much for day one, at minimum:

- Generate SQL migration.
- Define event/decision write patterns.
- Mock or manually insert first run records.

### Step 7: Solution design and implementation handoff

Claude writes `06_solution_design.md`, `07_test_plan.md`, and `09_implementation_handoff.md`.

### Step 8: Codex implementation

Codex reads the approved handoff and makes the change.

### Step 9: Review

Claude or a review routine checks the diff against:

- Acceptance criteria.
- Test plan.
- Scope boundaries.
- Human decisions.

### Step 10: ClickUp update

Claude creates a clean ClickUp comment for review/posting.

---

## 21. What To Avoid

Avoid these failure modes:

1. **Terminal as system of record**  
   Terminal logs are not durable review artefacts.

2. **Agents fetching their own context independently**  
   Creates duplication and inconsistent evidence.

3. **Skipping human approval gates**  
   Turns Quorum into uncontrolled automation.

4. **Overbuilding the React app too early**  
   Start with Claude Code + markdown + Supabase.

5. **Codex deciding product behaviour**  
   Codex should implement approved plans, not invent requirements.

6. **No audit event model**  
   Without events and decisions, you cannot reconstruct what happened.

7. **Unversioned outputs**  
   If requirements or designs change, retain previous versions.

8. **Generic persona theatre**  
   Use evidence-backed roles and codebase/doc context.

9. **Trying to solve all Quorum workflows in the first test**  
   The validation app grouping change is enough to prove the spine.

---

## 22. Definition Of Done For Phase 2 Test

The Phase 2 test is complete when:

- A ClickUp ticket has been processed through Quorum.
- A run folder exists with all required artefacts.
- Context Pack identifies relevant codebase areas.
- Requirements are clear and approved.
- Solution design is codebase-aware and approved.
- Test plan is specific.
- Implementation handoff is Codex-ready.
- Human decisions are recorded.
- Supabase schema exists or a clear migration is ready.
- Audit events are written or a concrete event-writing pattern is proven.
- Codex can implement from the handoff without needing to reinterpret the product ask.
- ClickUp receives a clean summary.
- A reviewer can reconstruct what happened, why, and who approved it.

---

## 23. Claude Code Immediate Next Action

Claude Code should begin by creating the Quorum operating files and running the validation-app test manually.

Recommended first command/task for Claude:

```text
Create the Quorum Phase 2 operating structure in this repo.

Add:
- QUORUM.md
- routines/orchestrator.md
- templates/run_manifest.md
- templates/human_decision.md
- templates/context_pack.md
- templates/implementation_handoff.md

Then create a sample run folder for the validation app ticket:
quorum-runs/2026-07-05-validation-app-group-alerts-by-subcategory/

Populate the initial artefacts up to:
- 00_run_manifest.md
- 01_ticket_intake.md
- 04_clarification_questions.md
- 03_persona_recommendation.md

Do not modify application code yet.
Pause for human approval before producing solution design.
```

---

## 24. Bottom Line

The robust system is not “Claude plans and Codex codes”.

The robust system is:

> **Quorum controls the lifecycle. the Context Discovery step gathers context. Claude designs. the Gate & Comms layer manages approvals. Supabase records state and audit. Codex implements only after approval. Markdown artefacts make the whole thing inspectable and reusable.**

For Phase 2, prove that spine with one small validation app change.
