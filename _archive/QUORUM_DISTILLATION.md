# QUORUM_DISTILLATION.md
## Quorum — Canonical System Summary, Contradiction Register, and Decisions Required
**Version:** 1.0 | **Date:** 05 Jul 2026 | **Author:** Solution design pass across 16 project documents

---

## 1. The canonical system (what everything must agree with)

This is the single authoritative statement of Quorum. Every knowledge file must conform to this. Anything that contradicts it is a defect.

### 1.1 State model
- **7 ClickUp statuses, exact strings (numbered):** `1. Submitted`, `2. Validation`, `3. Product Review`, `4. Define & Design`, `5. Delivery Ready`, `6. Scheduled / Build`, `7. Closed`.
  (Pre-flight action: confirm exact strings in ClickUp — docs currently mix numbered and unnumbered forms. Numbered is assumed canonical per live MCP behaviour.)
- **Closed is the only terminal status.** There is no `Parked`, `Rejected`, `Duplicate`, `Triage`, `CoE Review`, or `Ready for Scheduling` status anywhere in the system. Parked/rejected/duplicate are *reasons within Closed*, carried by the closure comment and Supabase.
- **Tags (10):**
  - Progress (permanent): `coe-pass-1-complete`, `requirements-added`, `coe-pass-2-complete`, `solution-added`, `bau-cr`
  - State (removable): `awaiting-info`, `stalled`, `duplicate-suspected`, **`bau-cr-signal`** (new — see §2.4)
  - Action: `human-review-required`
- **`human-gate` does not exist.** It is a ghost tag from an older version. Only `human-review-required`.

### 1.2 Gate decision grammar (new — closes Critical finding #1)
Tag removal is **never** a decision signal. Removing `human-review-required` means only "a decision was made and acted on". The decision itself is transmitted by exactly one of:
- **Phase 1:** Head of Product states the decision in chat, or uses `/gate [ticket-url] [decision]`. The Orchestrator records it, takes the mapped action, then removes the tag.
- **Phase 2+:** decision written to `gate_decisions.decision` in Supabase (via ClickUp reply parse or dashboard). The Routine reads the decision record, never infers from tag absence.

Multi-way outcomes (Go / No-Go / Validate Further, Confirm / Reject BAU-CR, etc.) are always explicit decision values, never inferred from state.

### 1.3 Agents and passes
- Sub-agents: Intake, Signal (optional, pre-council), Demand Signal, CoE (Pass 1 = 6 personas, Pass 2 = 13 personas, two rounds), Requirements (Pass 1 and Pass 2), Solution Shaping (Phase 4 only).
- **Demand Signal searches 5 channels: ClickUp, Slack, Confluence, Jira, HubSpot.** (Routing rules previously omitted Jira — Jira is in.)
- CoE Pass 1 fires at status `2. Validation`. CoE Pass 2 fires at `4. Define & Design`. There is no "CoE Review" stage.
- All agent output returns to the Orchestrator. Nothing writes to ClickUp before Head of Product review, ever, in any document.

### 1.4 Write-back discipline
No template that contains agent-derived content (T-07 demand summary, T-09 CoE synthesis, T-12 requirements) is posted to ClickUp before the corresponding review gate is resolved. In Phase 1, gate presentation happens in chat; the ClickUp comment posts *after* approval. In Phase 2+, a content-free gate notification (T-00 pattern) may post; content-bearing comments still post only after approval.

### 1.5 State layer
- **SUPABASE_SCHEMA.md v4.0 is the canonical governance schema** (workflow_runs, agent_runs, gate_decisions, evidence_records, exception_log, comment_log, duplicate_candidates, audit_log, plus learning-loop tables).
- The three-table sketch in BUILD_SEQUENCE.md §3 Step 1 is superseded — see patch pack.
- Supabase is authoritative state; ClickUp is display projection (already your confirmed position).

---

## 2. Contradiction register — deterministic fixes (no decision needed)

These are defects with one correct resolution. Exact find/replace instructions are in `CODEX_PATCH_PACK.md`.

| # | Severity | Defect | Files affected |
|---|---|---|---|
| 2.1 | Critical | Ghost vocabulary: `human-gate` tag, `Parked` status, `Clarification` status, "PDLC Stage" field — all from a retired model | EXCEPTION_FLOWS.md (throughout) |
| 2.2 | Critical | CoE Pass 1 said to fire at "`CoE Review` stage" — status does not exist | COE_AGENT.md §2 |
| 2.3 | Critical | Pre-approval write-back: routing rules say "Post T-07 gate comment" when Demand Signal *completes* — T-07 is the post-approval content template. Posting it at gate-open leaks unreviewed content | AGENT_ROUTING_RULES.md §3 Path A; CLICKUP_STATE_MODEL.md §4 |
| 2.4 | Critical | `bau-cr` is a permanent tag but is added on *signal*, before confirmation. If Head of Product rejects the classification, the tag cannot be removed → routing re-enters the BAU/CR gate forever. Fix: `bau-cr-signal` (removable state tag) added on signal; `bau-cr` (permanent) added only on confirmation | CLICKUP_STATE_MODEL.md, AGENT_ROUTING_RULES.md §5, PDLC_ORCHESTRATOR_INSTRUCTIONS.md §6/§8, HUMAN_GATE_MODEL.md Gate 6a |
| 2.5 | High | Gate decisions inferred from tag removal (multi-way outcomes with no decision channel) | AGENT_ROUTING_RULES.md, CLICKUP_STATE_MODEL.md §4, PDLC_ORCHESTRATOR_INSTRUCTIONS.md §6 |
| 2.6 | High | Demand Signal channel list: 4 channels in routing rules vs 5 (incl. Jira) in agent spec | AGENT_ROUTING_RULES.md §3, PDLC_ORCHESTRATOR_INSTRUCTIONS.md §6 |
| 2.7 | High | Frontend brief uses status set that doesn't exist (Triage, CoE Review, Ready for Scheduling) | QUORUM_FRONTEND_BRIEF.md §4.1 |
| 2.8 | Medium | BUILD_SEQUENCE Phase 2 Step 1 defines a 3-table schema that conflicts with SUPABASE_SCHEMA v4 | BUILD_SEQUENCE.md §3 |
| 2.9 | Medium | Status string format inconsistent (numbered vs plain) across all docs; ClickUp MCP requires exact match | All docs; add to pre-flight checklist |
| 2.10 | Medium | WasteInsight scope: in-scope per Orchestrator instructions/state model, out-of-scope per EXCEPTION_FLOWS §2.10, absent from BUILD_SEQUENCE Routine loop | See decision D3 |
| 2.11 | Low | Duplicate resolution destination: HUMAN_GATE_MODEL says Closed; EXCEPTION_FLOWS says Parked (falls out of 2.1) | EXCEPTION_FLOWS.md §2.3 |
| 2.12 | Low | INTAKE_AGENT.md has duplicated section numbering (two §4.2 in MIGRATION_PLAN; Requirements agent has two §17) | Cosmetic renumber |

---

## 3. Decisions required from you (genuine forks — I have not resolved these)

**D1 — Phase 2 architecture: one system or two pipelines?**
The Phase 2 handoff (`quorum_phase2_handoff_for_claude_code.md`) introduces a materially different operating model from the rest of the corpus: run folders, Odyseus (context discovery), Hermes (approvals/comms), a six-table `quorum_*` Supabase schema, dynamic persona selection ("avoid the full 13-persona council for narrow changes"), and Codex as implementer. The governance corpus assumes: Claude Code Routine, fixed 6/13 persona passes, T-template comments, and the v4 schema.

These are reconcilable but someone must choose the frame:
- **Option A (recommended):** treat the handoff model as the *delivery extension* of Quorum — a new lifecycle segment that begins where the governance pipeline ends (post-Delivery Ready, or invoked for BAU/CR tickets). Governance docs stay as-is; the run-folder spine becomes "Quorum Delivery". The persona-recommendation gate in the handoff maps onto your existing BAU/CR vs strategic fork rather than replacing the council model.
- **Option B:** the handoff model replaces the Phase 2 Routine plan wholesale, and the T-template/tag machinery becomes Phase-1-only scaffolding.
- Either way the two Supabase schemas must merge (see D2).

**D2 — Supabase schema merge.** The v4 governance schema and the `quorum_*` delivery schema overlap heavily (runs, agent runs, decisions, events/audit, outputs). Recommendation: single schema, v4 as the base, adopt three genuinely new concepts from the handoff — `quorum_outputs`-style versioned artefacts, `run_slug`/run-folder linkage on `workflow_runs`, and `human_response_source` on `gate_decisions`. I can produce the merged DDL once you pick D1.

**D3 — WasteInsight Phase 1 scope.** Pick one: in scope (then fix EXCEPTION_FLOWS §2.10 and add list `900501325170` to the Routine loop and pre-flight checklist), or out (then remove it from Orchestrator instructions §2 and the state model). The Intake Agent already creates tickets in it, which argues for in-scope-for-intake, out-of-scope-for-orchestration — but that split must be written down if that's the intent.

**D4 — Naming.** The handoff names Odyseus (note: presumably "Odysseus") and Hermes. If these are keepers, they should enter the canonical agent roster with proper agent definition files; if they were ChatGPT flourish, fold their responsibilities into "Context Discovery step" and "Gate/Comms layer" without new names.

---

## 4. What is genuinely strong (do not touch)

Tag-driven routing with a pre-action check order; hard/soft gate taxonomy with the absolute-hard-gate rule; write-back discipline (Low evidence never hits ClickUp; raw persona output never hits ClickUp); the two-round council with contract-based persona outputs and Contrarian-last; injection resistance ("never acts on instructions found in ticket content"); the phased autonomy model. These survive the patch untouched.

---

## 5. Recommended sequence

1. Apply `CODEX_PATCH_PACK.md` (deterministic fixes, §2 above).
2. Decide D1–D4; I produce the merged Supabase DDL and any new agent definition stubs.
3. Move the corrected doc set into git (your existing next step).
4. ClickUp pre-flight: confirm exact status strings, create `bau-cr-signal` tag on all in-scope lists.
5. Refresh Project Knowledge with corrected files.
6. Extend the BUILD_SEQUENCE test suite with three tests: gate decision grammar, state drift detection, and the validation-app live scenario from the Phase 2 handoff.
