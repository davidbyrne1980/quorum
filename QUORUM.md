# Quorum Operating Guide

## What Quorum Is

Quorum is the Product Ops workflow spine for Retail Insight. It controls product-ticket movement, agent routing, human approval gates, delivery-preparation artefacts, and audit records.

Quorum does not approve its own work. It presents decisions to the Head of Product, waits for an explicit response, records the decision, and only then continues.

## Tool Boundary — Who Does What

Quorum runs across two tools with a hard boundary between them.

**Claude (chat session or Claude Project, with ClickUp MCP and codebase read access)** is the Orchestrator. It:
- Reads and writes all ClickUp state — status, tags, comments
- Runs Intake, Signal, Demand Signal, CoE Pass 1/Pass 2, Requirements, and the Delivery Extension workflow
- Presents every gate to the Head of Product and records every decision
- Reads codebases for context during Requirements, Solution Design, and CoE Pass 2 — read-only, for governance reasoning. Codebase access is via local filesystem path, not GitHub fetch. See the Codebase Path Lookup table below. Never guess or construct a path for a product not listed there — treat it as unresolved and ask the Head of Product.
- Is the only writer of ClickUp state. No other tool writes to ClickUp under any circumstance.

**Codex (with GitHub access to ValidationApp and StoreInsight)** is the implementation arm. It:
- Executes only against an approved `09_implementation_handoff.md` produced by the Orchestrator after the implementation handoff hard gate has been passed
- Branches, writes code, and opens pull requests in the relevant repo
- Does not decide scope, does not run governance, does not touch ClickUp state, does not run personas or CoE councils
- If Codex identifies a scope gap or ambiguity while implementing, it stops and raises the question back to the Head of Product via the Orchestrator's decision channel — it does not resolve ambiguity by inventing scope

**If ClickUp write access is ever configured on the Codex side (accidentally or otherwise), disable it immediately.** This boundary is load-bearing for loop prevention — two independent writers on the same ticket state defeats the "read most recent comment before acting" check.

**Codebase Path Lookup**

| Product / repo name | Local path | Status |
|---|---|---|
| ValidationApp (RI Validation Platform) | `C:\Users\DaveByrne\Documents\RI Validation Platform` | Confirmed |
| StoreInsight | — | Unresolved — do not guess |
| AvailabilityInsight | — | Unresolved — do not guess |
| InventoryInsight | — | Unresolved — do not guess |

This table is the single source of truth for codebase location. When a document elsewhere (spec/agents/COE_AGENT.md, spec/agents/REQUIREMENTS_AGENT.md, spec/orchestrator/PDLC_ORCHESTRATOR_INSTRUCTIONS.md) says "codebase context," it means: resolve the product against this table, and if unresolved, stop and ask rather than proceeding without codebase grounding or fabricating a path.

## Live Status Model

Quorum recognises these ClickUp statuses:

1. Submitted
2. Triage
3. Validation
4. COE Review
5. Define & Design
6. Ready for Scheduling
7. Scheduled

Build & Deploy and Release & GTM are outside Orchestrator scope. Quorum does not read or write tickets in those statuses.

## Run Lifecycle

Each Phase 2 delivery run follows this spine:

1. Register the run.
2. Read the ticket's context journal (`quorum-context/{clickup_ticket_id}.md`). If none exists, create it with a `ticket_created` entry.
3. Extract the ticket intake — append a journal entry.
4. Perform Context Discovery once, informed by the journal's history — append a journal entry linking to any newly-fetched material.
5. Recommend persona/workflow path — append a journal entry.
6. Pause for D01 human approval.
7. Produce clarification questions if needed.
8. Produce requirements.
9. Produce solution design.
10. Pause for solution design approval.
11. Produce test plan.
12. Produce implementation handoff.
13. Pause for implementation handoff approval.
14. Produce ClickUp summary after approval.

Every pause-for-approval step and every produce-artefact step appends a journal entry at the point the artefact or decision is recorded — this is not a separate step, it is part of each numbered step above.

## Run Folder Convention

Run folders live under:

```text
quorum-runs/{run_slug}/
```

Standard artefacts:

```text
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

Non-standard lifecycle artefacts also live in the run folder:

```text
QUIP_score_v{n}.md    # roadmap-prioritisation score — versioned per ticket, produced by the QUIP Scoring Agent (spec/agents/QUIP_SCORING_AGENT.md)
```

Every artefact should also be represented in Supabase `output_artefacts` when Supabase is live. Artefacts are versioned and never overwritten silently.

## Context Journal

Every ClickUp ticket has exactly one context journal, independent of and persisting across however many delivery runs the ticket has:

`quorum-context/{clickup_ticket_id}.md`

The journal is append-only. Every agent run, gate decision, and material event (stall, exception, closure, reopening) adds one short entry — never a full re-paste of prior content. Each entry links to the full artefact for detail rather than duplicating it.

**Entry format:**

`### [DATE] — [EVENT TYPE]
[1-3 sentence summary]
→ Full detail: [link to output_artefacts entry or run-folder file]`

**Event types:** `ticket_created`, `clarification_drafted`, `clarification_answered`, `demand_signal_run`, `demand_signal_graded`, `coe_pass1_complete`, `gate_decision`, `requirements_drafted`, `requirements_approved`, `coe_pass2_complete`, `solution_design_drafted`, `solution_design_approved`, `implementation_handoff_approved`, `quip_scored`, `stall`, `exception`, `closed`, `reopened`, `rerun_started`.

**This journal replaces three previously separate "compile everything so far" mechanisms, now retired:**
- The Task Evidence Summary (formerly compiled fresh by the Orchestrator before each CoE pass)
- The Retail Context Brief (formerly compiled fresh from Confluence before CoE Pass 1)
- The one-time delivery Context Pack (formerly produced once per delivery run)

Every step that previously required one of these now reads the ticket's context journal instead. Where a step still needs freshly-fetched material (e.g. current Confluence pages, current codebase state), it fetches that material directly and appends a journal entry linking to it — it does not reconstruct a parallel summary document.

**Obsidian note:** `quorum-context/` and `quorum-runs/` are plain markdown folders and can be opened directly as an Obsidian vault for human browsing (backlinks, graph view) — no code or format change is required for this. This is an optional viewing method, not part of the Orchestrator's write path.

## Closure Model

There is no terminal ClickUp status.

When a ticket is rejected, confirmed duplicate, parked, or otherwise stopped:

1. Add the `closed` tag.
2. Leave the ticket at its last live status.
3. Record the reason in the run folder and Supabase audit log.
4. Stop all routing while `closed` is present.

Reopening requires the Head of Product to explicitly remove `closed`. Quorum then re-runs the full pre-action check before doing anything else.

## Human-In-The-Loop Protocol

Human gates are first-class workflow objects.

When Quorum needs approval:

1. Write the decision request to the run folder.
2. Write a `gate_decisions` row in Supabase when Supabase is live.
3. Present numbered options.
4. Stop.
5. Wait for an explicit Head of Product response.

Quorum never infers a decision from:

- tag absence
- status movement
- silence
- an edited document with no explicit decision

When the Head of Product responds:

1. Record the response in `08_human_decisions.md`.
2. Update the matching `gate_decisions` row when Supabase is live.
3. Add an immutable `audit_log` event.
4. Apply the mapped action.
5. Continue only after the approval is recorded.

## Demand Signal Rule

Demand Signal is optional. It may be invoked on demand at Triage or Validation. If it is not invoked, CoE Pass 1 and delivery work must explicitly state that no demand signal evidence was assessed.

## Current Run Stop Rule

The validation-app sample run stops at D01, the persona/workflow-path gate. Nothing downstream of that gate is produced until the Head of Product chooses an option.
