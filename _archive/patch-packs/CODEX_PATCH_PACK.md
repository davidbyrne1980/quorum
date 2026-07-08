# CODEX_PATCH_PACK.md
## Quorum — Deterministic Fix Set for Codex
**Version:** 1.0 | **Date:** 05 Jul 2026
**Instruction to Codex:** Apply the edits below to the named files exactly. Where a "Replace" block gives a find string, match it verbatim (it is unique in the file unless stated). Do not make any edits beyond those listed. After each file, run a self-check: the ghost terms `human-gate` (as a tag), `Parked` (as a status), `Clarification` (as a status), and `CoE Review` (as a status) must not appear anywhere except in historical/migration notes explicitly marked as such.

---

## PATCH 1 — EXCEPTION_FLOWS.md (vocabulary alignment, whole file)

This file predates the v2 state model. Apply these global replacements:

1. Every occurrence of the tag `` `human-gate` `` → `` `human-review-required` ``.
2. Every occurrence of moving/setting status to `` `Parked` `` → `` `Closed` `` (the closure comment carries the parked reason).
3. §2.1 title and trigger: replace status `` `Clarification` `` with: status `` `2. Validation` `` with `` `awaiting-info` `` tag active.
4. All "PDLC Stage" field references → "ClickUp status" (there is no separate stage field in Phase 1).
5. §2.1 outcome table, row "Park ticket": replace action text with: "Move status to `7. Closed`. Post T-16 closure comment (reason: no submitter response, 9 working days). Remove `awaiting-info`, `stalled`, `human-review-required`."
6. §2.3 outcome table, rows "Confirmed duplicate — close" and "— merge": destination status is `7. Closed` (aligning with HUMAN_GATE_MODEL Gate 1), posting T-16 referencing the canonical ticket.
7. §2.1/2.3/2.4/2.5 inline comment strings (e.g. "Duplicate suspected — gate active — [date]") — append a note at the top of §2: "All comments in this document are posted using the templates in CLICKUP_COMMENT_TEMPLATES.md with the 🤖 PDLC Orchestrator header; the inline strings below are audit-log summaries, not literal comment bodies."
8. §2.10: leave the WasteInsight scope statement but add: "⚠️ OPEN — conflicts with PDLC_ORCHESTRATOR_INSTRUCTIONS.md §2 which lists WasteInsight in scope. Pending Product Manager decision D3 (see QUORUM_DISTILLATION.md)."

---

## PATCH 2 — COE_AGENT.md (invocation stage)

**Find:** `**Pass 1** is invoked by the PDLC Orchestrator at ``CoE Review`` stage, after the Demand Signal gate has been resolved by the Product Manager.`

**Replace with:** `**Pass 1** is invoked by the PDLC Orchestrator while the ticket is at status ``2. Validation``, after the Demand Signal review gate (Gate 2/3) has been resolved by the Product Manager. On Pass 1 completion the Orchestrator moves the ticket to ``3. Product Review``.`

---

## PATCH 3 — AGENT_ROUTING_RULES.md

### 3a — Pre-approval write-back (§3, Path A)
**Find:** `Add ``human-review-required``. Post T-07 gate comment (demand signal awaiting review).`
**Replace with:** `Add ``human-review-required``. Phase 1: present the full graded output in chat for Product Manager review — post nothing to ClickUp yet. Phase 2+: post a content-free gate notification (T-00 pattern) only. The T-07 content comment posts only after approval (Path B).`

### 3b — Demand Signal channels (§3, Path A)
**Find:** `Agent searches: ClickUp, Confluence, Slack, HubSpot.`
**Replace with:** `Agent searches: ClickUp, Confluence, Slack, Jira, HubSpot.`

### 3c — Gate decision grammar (§3, Status: Product Review)
**Find:** `**If ``human-review-required`` removed:** Product Manager has decided.`
**Replace with:** `**Decision received:** The Product Manager transmits the decision explicitly — in chat or via ``/gate [ticket-url] [decision]`` (Phase 1), or via a ``gate_decisions`` record (Phase 2+). Tag removal is never itself the decision signal; the Orchestrator removes ``human-review-required`` only after recording and acting on the explicit decision.`

Apply the same replacement pattern to the equivalent line in **Status: Delivery Ready** (`**If ``human-review-required`` removed:**` → decision-received wording) and in the Define & Design sections where "`human-review-required` removed" is used as a trigger: in each case, the trigger becomes "explicit Product Manager decision recorded; `human-review-required` subsequently removed by the Orchestrator".

### 3d — bau-cr signal/confirm split (§5)
**Find:** `**If BAU/CR signal present:**
Add ``bau-cr`` tag.`
**Replace with:** `**If BAU/CR signal present:**
Add ``bau-cr-signal`` tag (state tag — removable).`

**Find:** `**If confirmed:**
Skip CoE Pass 2 and Solution Shaping entirely.
Move directly to Delivery Ready gate.`
**Replace with:** `**If confirmed:**
Remove ``bau-cr-signal``. Add ``bau-cr`` (permanent progress tag).
Skip CoE Pass 2 and Solution Shaping entirely.
Move directly to Delivery Ready gate.`

**Find:** `**If rejected:**
Remove BAU/CR signal note. Continue standard path to CoE Pass 2.`
**Replace with:** `**If rejected:**
Remove ``bau-cr-signal``. Do NOT add ``bau-cr``. Continue standard path to CoE Pass 2. (This prevents the rejected-classification loop: only the removable signal tag exists pre-confirmation.)`

### 3e — Define & Design routing check (§3)
**Find:** `**Check ``bau-cr`` tag:**

**If ``bau-cr`` present:**`
**Replace with:** `**Check ``bau-cr-signal`` tag:**

**If ``bau-cr-signal`` present:**`

**Find:** `**If ``bau-cr`` confirmed by Product Manager:**`
**Replace with:** `**If BAU/CR confirmed by Product Manager (``bau-cr-signal`` swapped for ``bau-cr``):**`

**Find:** `**If not ``bau-cr``:**`
**Replace with:** `**If ``bau-cr-signal`` absent:**`

---

## PATCH 4 — CLICKUP_STATE_MODEL.md

### 4a — Add bau-cr-signal to tags (§2)
In the **State tags** table, add row:
`| ``bau-cr-signal`` | Orchestrator identifies BAU/CR signal from Requirements output | Product Manager confirms (→ swap to ``bau-cr``) or rejects (tag removed, standard path) |`

In the **Progress tags** table, change the `bau-cr` row "Added when" cell to: `Product Manager confirms BAU/CR classification at Gate 6a`.

### 4b — Routing block (§4, Define & Design)
**Find:** `  → Check bau-cr tag
  → If bau-cr: add human-review-required (BAU/CR delivery ready confirmation gate)
  → If not bau-cr: Run CoE Pass 2 (all 13 personas)`
**Replace with:** `  → Check bau-cr-signal tag
  → If bau-cr-signal: add human-review-required (Gate 6a — BAU/CR confirmation)
      → Confirmed: remove bau-cr-signal, add bau-cr, move → Delivery Ready
      → Rejected: remove bau-cr-signal, run CoE Pass 2
  → If no bau-cr-signal: Run CoE Pass 2 (all 13 personas)`

### 4c — Decision grammar note (§4, after the Validation block intro)
Insert after the line "The daily Routine loops through all open tickets and applies this logic per ticket.":
`**Decision grammar:** wherever this document says "human-review-required removed", the operative trigger is an explicit Product Manager decision (chat / /gate command in Phase 1; gate_decisions record in Phase 2+). The Orchestrator removes the tag as a consequence of acting on the decision — tag absence alone never encodes which option was chosen.`

### 4d — Pre-flight checklist (§9)
In the tag-creation checklist item, add `` `bau-cr-signal` `` to the tag list, and add two new checklist items:
`- [ ] Confirm exact ClickUp status strings including numbering (e.g. "1. Submitted", "3. Product Review") — MCP status writes require exact match`
`- [ ] Confirm WasteInsight list scope decision (D3) before enabling orchestration on 900501325170`

---

## PATCH 5 — PDLC_ORCHESTRATOR_INSTRUCTIONS.md

### 5a — §6 Validation routing: apply the same two fixes as Patch 3a/3b
**Find:** `Demand Signal not yet run:
  → Invoke Demand Signal Agent
  → Store output in Supabase
  → Add human-review-required (Product Manager grades evidence)
  → If grade Low: post T-08, hard gate`
**Replace with:** `Demand Signal not yet run:
  → Invoke Demand Signal Agent (searches ClickUp, Confluence, Slack, Jira, HubSpot)
  → Store output in Supabase — nothing posts to ClickUp pre-approval
  → Add human-review-required; present graded output in chat (Phase 1)
  → If overall grade Low: hard gate (Gate 3) — T-08 posts only with Product Manager awareness`

### 5b — §6/§8 bau-cr: replace signal-stage `bau-cr` with `bau-cr-signal` exactly as in Patch 3d/3e. In §7 Tags Reference, mirror Patch 4a (add `bau-cr-signal` to state tags; `bau-cr` set only on confirmation).

### 5c — §6: insert the same decision-grammar note as Patch 4c at the top of the Tag-Driven Routing section, and reword every "human-review-required removed:" trigger to "Explicit Product Manager decision recorded:".

### 5d — §10 Human Gate Protocol
**Find:** `**When the Product Manager responds:**
1. Remove ``human-review-required``.
2. Record the decision.
3. Route accordingly.`
**Replace with:** `**When the Product Manager responds:**
1. Record the explicit decision (chat / /gate command; Phase 2+: gate_decisions record) — the decision value, not tag state, determines routing.
2. Take the action mapped to that decision.
3. Remove ``human-review-required`` last, as confirmation the decision was actioned.`

---

## PATCH 6 — HUMAN_GATE_MODEL.md (Gate 6a)

**Find:** `| Confirm BAU/CR | Tag ``bau-cr`` already added. Move status → Delivery Ready. Add ``human-review-required``. Proceed to Gate 8. |`
**Replace with:** `| Confirm BAU/CR | Remove ``bau-cr-signal``. Add ``bau-cr`` (permanent). Move status → Delivery Ready. Add ``human-review-required``. Proceed to Gate 8. |`

**Find:** `| Reject BAU/CR — treat as strategic | Remove BAU/CR signal note. Remove ``human-review-required``. Invoke CoE Pass 2. Continue standard path. |`
**Replace with:** `| Reject BAU/CR — treat as strategic | Remove ``bau-cr-signal``. Do NOT add ``bau-cr``. Remove ``human-review-required``. Invoke CoE Pass 2. Continue standard path. |`

Also in §2, append to the `human-review-required` paragraph: `Gate decisions are always transmitted explicitly (chat, /gate command, or gate_decisions record). Removing the tag communicates that a decision was actioned — never which decision.`

---

## PATCH 7 — BUILD_SEQUENCE.md (§3 Step 1 schema supersession)

**Find:** the fenced block beginning `tickets` and ending with the `audit_log` table sketch (the three-table code block in Phase 2 Step 1).
**Replace with:** `The full Phase 2 schema is defined in SUPABASE_SCHEMA.md v4.0 (workflow_runs, agent_runs, gate_decisions, evidence_records, exception_log, comment_log, duplicate_candidates, audit_log, plus learning-loop tables). Build that schema — the earlier three-table sketch is superseded. Do not maintain two schema definitions.`

Also in §3 Routine prompt description, after `InventoryInsight (901204771890)`, add: `(WasteInsight 900501325170 pending scope decision D3)`.

In §5, add three test scenarios:
`**Test 6 — Gate decision grammar:** Resolve a multi-way gate (Gate 4) with each of Go / No-Go / Validate Further via explicit decision. Confirm the Orchestrator never routes from tag absence alone and records the decision value.`
`**Test 7 — State drift detection:** Manually alter a tag in ClickUp mid-flow. Confirm the Orchestrator detects the mismatch against Supabase and raises an exception rather than routing on drifted state.`
`**Test 8 — Live scenario:** Run the validation-app "group alerts by sub-category" ticket end-to-end per the Phase 2 handoff success criteria.`

---

## PATCH 8 — QUORUM_FRONTEND_BRIEF.md (§4.1 status set)

**Find:** `(Submitted, Triage, Validation, CoE Review, Define & Design, Ready for Scheduling)`
**Replace with:** `(1. Submitted, 2. Validation, 3. Product Review, 4. Define & Design, 5. Delivery Ready, 6. Scheduled / Build)`

---

## PATCH 9 — CLICKUP_COMMENT_TEMPLATES.md (T-07 timing note)

In the T-07 header block, change **When posted:** to: `After the Product Manager approves the filtered demand signal write-back at Gate 2. Never posted at gate-open — pre-approval, output lives in Supabase/chat only.`

---

## Post-patch verification checklist (run after all patches)

- [ ] `grep -rn "human-gate" *.md` → only hits inside historical notes, if any
- [ ] `grep -rn "Parked" *.md` → only as a closure *reason*, never a status transition target
- [ ] `grep -rn "CoE Review" *.md` → zero hits as a status
- [ ] Every "human-review-required removed" trigger now paired with explicit-decision wording
- [ ] `bau-cr` appears as an *added* tag only at Gate 6a confirmation; `bau-cr-signal` covers pre-confirmation
- [ ] Demand Signal channel list = 5 everywhere
- [ ] Only one Supabase schema definition exists (SUPABASE_SCHEMA.md)
