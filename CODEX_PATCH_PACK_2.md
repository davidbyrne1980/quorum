# CODEX_PATCH_PACK_2.md
## Quorum — Supplementary Fix Set (Decisions D1–D4 applied)
**Version:** 1.0 | **Date:** 05 Jul 2026
**Depends on:** CODEX_PATCH_PACK.md (apply that first)
**Decisions encoded:** D1/D4 — no Odyseus/Hermes adoption; delivery-extension concepts folded into existing docs without new agent names. D2 — single Supabase schema, v4 base. D3 — WasteInsight OUT of Phase 1 orchestration scope.

**Instruction to Codex:** Apply the edits below exactly. Where a "Replace" block gives a find string, match it verbatim.

---

## PATCH 10 — WasteInsight descope (D3)

### 10a — PDLC_ORCHESTRATOR_INSTRUCTIONS.md §2
**Find:** `**Products in scope (Phase 1):**
- AvailabilityInsight — ClickUp List ID: ``901209020398``
- InventoryInsight — ClickUp List ID: ``901204771890``
- WasteInsight — ClickUp List ID: ``900501325170```
**Replace with:** `**Products in scope (Phase 1):**
- AvailabilityInsight — ClickUp List ID: ``901209020398``
- InventoryInsight — ClickUp List ID: ``901204771890``

**Out of orchestration scope (Phase 1):** WasteInsight (``900501325170``). The Intake Agent may still create tickets in this list; the Orchestrator does not process them (see EXCEPTION_FLOWS.md §2.10). If invoked against a WasteInsight ticket, respond that the list is out of Phase 1 scope and take no action.`

### 10b — CLICKUP_STATE_MODEL.md §7
In the lists table, move the WasteInsight row below the table into a note: `WasteInsight (``900501325170``) — intake-only in Phase 1. Not orchestrated. Do not create Quorum tags or run the Routine against this list.`

Also in §9 pre-flight checklist: remove the earlier D3-pending item (added by Patch 4d) and change all "both lists" phrasing to explicitly name AvailabilityInsight and InventoryInsight.

### 10c — EXCEPTION_FLOWS.md §2.10
Remove the "⚠️ OPEN — conflicts with..." note added by Patch 1 item 8. Replace with: `Resolved: WasteInsight is confirmed out of Phase 1 orchestration scope (intake-only). This section is authoritative.`

### 10d — INTAKE_AGENT.md §2
After the lists table, add: `Note: WasteInsight is intake-only in Phase 1. Tickets created there are not picked up by the Orchestrator until WasteInsight enters orchestration scope in a later phase.`

### 10e — BUILD_SEQUENCE.md §3
Remove the `(WasteInsight 900501325170 pending scope decision D3)` note added by Patch 7. The Routine loops AvailabilityInsight and InventoryInsight only.

### 10f — DEMAND_SIGNAL_AGENT.md / SIGNAL_AGENT.md
No change — cross-list *searching* for evidence remains permitted (WasteInsight tickets are valid evidence sources even though they are not orchestrated).

---

## PATCH 11 — Remove Odyseus/Hermes framing from Phase 2 handoff (D1/D4)

File: `quorum_phase2_handoff_for_claude_code.md`

### 11a — Add a supersession header directly under the title:
`> **Status note (05 Jul 2026):** This document originated outside the Quorum canonical set. The named agents "Odyseus" and "Hermes" are NOT adopted — their responsibilities are implemented as Orchestrator workflow steps ("Context Discovery" and "Gate & Comms handling" respectively), built in-house. The six-table quorum_* schema in §9 is superseded by SUPABASE_SCHEMA.md v5 (merged). The retained concepts are: run folders, the Context Pack, versioned outputs, explicit decision records, the validation-app test case, and the "What To Avoid" list.`

### 11b — Global replacements in the same file:
- `Odyseus` → `the Context Discovery step`
- `Hermes` → `the Gate & Comms layer`
(Adjust surrounding grammar minimally where needed; do not otherwise rewrite sections.)

---

## PATCH 12 — SUPABASE_SCHEMA.md → v5 (D2 merge)

Bump header to **Version: 5.0**. The v4 tables remain the base and are unchanged except as below. The `quorum_*` schema from the Phase 2 handoff is NOT built as separate tables — its three genuinely new concepts are absorbed:

### 12a — `workflow_runs`: add run-folder linkage and re-run support
Append these columns to the CREATE TABLE (before the timestamps):

```sql
  -- Run identity and artefact linkage (merged from Phase 2 handoff)
  run_number                INTEGER NOT NULL DEFAULT 1,
  run_slug                  TEXT,
  -- e.g. '2026-07-05-869xxxxx-group-alerts-by-subcategory'
  run_folder_path           TEXT,
  -- path to the markdown run folder, if one exists for this run
  trigger_type              TEXT NOT NULL DEFAULT 'manual_claude_project',
  -- 'manual_claude_project' | 'manual_claude_code' | 'clickup_status_change' |
  -- 'scheduled_routine' | 'rerun' | 'resume_after_human_decision'
  triggered_by              TEXT,
```

And change the UNIQUE constraint: replace `clickup_ticket_id TEXT NOT NULL UNIQUE` with `clickup_ticket_id TEXT NOT NULL` and add at the end of the table definition: `UNIQUE (clickup_ticket_id, run_number)` — one ticket may have multiple runs (re-runs after material scope change).

### 12b — New table `output_artefacts` (versioned outputs)
Add as §3.9:

```sql
CREATE TABLE output_artefacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID NOT NULL REFERENCES workflow_runs(id),
  agent_run_id      UUID REFERENCES agent_runs(id),
  clickup_ticket_id TEXT NOT NULL,

  output_type       TEXT NOT NULL,
  -- 'ticket_intake' | 'context_pack' | 'clarification_questions' |
  -- 'demand_signal_report' | 'coe_pass1_review' | 'coe_pass2_review' |
  -- 'requirements' | 'requirements_delta' | 'solution_design' |
  -- 'test_plan' | 'implementation_handoff' | 'clickup_summary' |
  -- 'retail_context_brief' | 'decision_prompt'

  title             TEXT NOT NULL,
  content_markdown  TEXT,
  content_json      JSONB,
  file_path         TEXT,

  version           INTEGER NOT NULL DEFAULT 1,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  supersedes        UUID REFERENCES output_artefacts(id),

  created_by        TEXT NOT NULL DEFAULT 'agent',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Rule to state in prose beneath it: `Outputs are never overwritten. A revision inserts a new row with version+1, sets is_current=true, points supersedes at the prior row, and flips the prior row's is_current to false.`

### 12c — `gate_decisions`: add response provenance and status
Append columns:

```sql
  status                TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'modified' | 'rejected' | 'superseded' | 'expired'
  human_response        TEXT,
  -- verbatim response text where available
  human_response_source TEXT,
  -- 'claude_chat' | 'claude_code_chat' | 'clickup_comment' |
  -- 'react_dashboard' | 'slack' | 'manual_admin'
  options_presented     JSONB NOT NULL DEFAULT '[]'::jsonb,
```

### 12d — §1 Purpose: append a third role
`**Role 3 — Delivery Extension State**
When a ticket exits governance (post-Delivery Ready, or via the BAU/CR lane) and enters delivery preparation (context pack → solution design → test plan → implementation handoff → Codex), the same tables carry it: workflow_runs gains a run per delivery cycle, output_artefacts holds the versioned run-folder documents, gate_decisions holds the delivery approval gates (solution design approval, implementation handoff approval). No parallel schema exists.`

### 12e — Delete/ignore directive
Add to §2 Design Principles: `- **One schema.** The quorum_* table set proposed in the Phase 2 handoff is not built. This document is the only schema definition.`

---

## PATCH 13 — PDLC_ORCHESTRATOR_INSTRUCTIONS.md: delivery-extension gates (D1, Option A)

Append a new section after §12 (Deployment Model):

`## 12a. Delivery Extension (Phase 2 spine)

When a ticket is approved at Gate 8 (or confirmed BAU/CR at Gate 6a), Quorum may continue into delivery preparation under the same governance rules. This is a workflow segment, not new agents:

1. **Context Discovery step** — gather ClickUp ticket, docs, codebase areas, API routes, data fields, tests, and prior related tickets ONCE into a Context Pack (output_artefacts type 'context_pack'). Downstream steps consume the pack; they do not re-fetch independently.
2. **Solution Design** → soft gate (decision_type 'solution_design_approval').
3. **Test Plan** → produced alongside design.
4. **Implementation Handoff** → hard gate (decision_type 'implementation_handoff_approval') before anything is passed to Codex. Codex implements only the approved handoff — it never decides product behaviour.
5. **ClickUp summary** → posted after Head of Product approval, standard write-back rules apply.

All artefacts are written to a run folder (quorum-runs/{run_slug}/) and versioned in output_artefacts. All decisions go through gate_decisions with the explicit decision grammar (§6). Existing hard-gate rules apply unchanged: no gate is bypassed, no code changes occur pre-approval.`

---

## Post-patch verification checklist

- [ ] `grep -rn "Odyseus\|Hermes" *.md` → hits only in the supersession note of the handoff doc
- [ ] `grep -rn "quorum_tickets\|quorum_runs\|quorum_decisions" *.md` → hits only in the handoff doc under its supersession note
- [ ] WasteInsight appears only as: intake-only note, evidence-search source, and EXCEPTION_FLOWS §2.10 resolved statement
- [ ] SUPABASE_SCHEMA.md is v5.0 and is the sole schema definition; BUILD_SEQUENCE references it and defines no tables
- [ ] `workflow_runs` supports multiple runs per ticket; `output_artefacts` exists; `gate_decisions` has status + human_response_source
