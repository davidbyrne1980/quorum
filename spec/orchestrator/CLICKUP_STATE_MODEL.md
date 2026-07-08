# CLICKUP_STATE_MODEL.md
## PDLC Orchestrator — ClickUp State Model
**Version:** 4.0 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. ClickUp Statuses

Nine live ClickUp statuses. Quorum orchestrates the first six. The final three are fully out of Orchestrator scope — no read, no write, ever.

| # | Status (live ClickUp string) | Orchestrator role |
|---|---|---|
| 1 | Submitted | Intake Agent fires here |
| 2 | Triage | Optional deeper-dig stage. Frequently skipped in practice — tickets may move directly from Submitted/Validation to COE Review. The Orchestrator does not force a ticket through Triage. Demand Signal Agent may be invoked here on demand (see §4a). |
| 3 | Validation | PM sanity check that the idea is valid to progress. Clarification and stall management happen here. Demand Signal Agent may be invoked here on demand (see §4a) — no longer mandatory. |
| 4 | COE Review | CoE Pass 1 runs here — hard gate for Product Manager go/no-go (Gate 4, same role as the former "Product Review" name) |
| 5 | Define & Design | Requirements Agent and CoE Pass 2 fire here |
| 6 | Ready for Scheduling | All gates passed — hard gate before handoff (Gate 8, same role as the former "Delivery Ready" name) |
| 7 | Scheduled | Orchestrator scope ends here. No further Orchestrator action. |
| 8 | Build & Deploy | **Out of scope.** Orchestrator never reads or writes tickets at this status. |
| 9 | Release & GTM | **Out of scope.** Orchestrator never reads or writes tickets at this status. |

**There is no terminal ClickUp status.** Closure (rejected, duplicate, parked, or otherwise stopped) is recorded via the tag `closed` — the ticket remains at its last live status. See §2 for the tag and §4a for closure handling. Any pipeline or dashboard view distinguishing live from dead tickets must filter on the `closed` tag, not on status.

Exact live string capitalisation must be confirmed against the ClickUp API response (not the UI display) before any MCP write. Update this table with the confirmed literal strings if they differ from the Title Case shown above.

---

## 2. Tags

Tags are the state detail layer. The Orchestrator reads tags before taking any action. Tags are lowercase, hyphenated, no spaces.

### Progress tags — permanent record once set

| Tag | Added when | Removed when |
|---|---|---|
| `coe-pass-1-complete` | CoE Pass 1 output produced | Never |
| `requirements-added` | Requirements Agent output written to ticket | Never |
| `coe-pass-2-complete` | CoE Pass 2 Virtual Workshop output produced | Never |
| `solution-added` | Solution Shaping output written to ticket | Never |
| `bau-cr` | Product Manager confirms BAU/CR classification at Gate 6a | Never |

### State tags — removed when no longer relevant

| Tag | Added when | Removed when |
|---|---|---|
| `awaiting-info` | Orchestrator posts clarification questions | Submitter provides sufficient answers |
| `stalled` | Day 3 working-day timer fires with no reply | Submitter provides answers or ticket has `closed` tag |
| `duplicate-suspected` | Intake Agent flags possible duplicate | Product Manager resolves the gate |
| `bau-cr-signal` | Orchestrator identifies BAU/CR signal from Requirements output | Product Manager confirms (→ swap to `bau-cr`) or rejects (tag removed, standard path) |

### Action and terminal tags

| Tag | Added when | Removed when |
|---|---|---|
| `human-review-required` | Any gate becomes active | Product Manager provides a decision and Orchestrator acts on it |
| `closed` | Ticket is rejected, confirmed duplicate, parked, or otherwise terminated | Never automatically. Only if the Product Manager explicitly reopens the ticket. |

---

## 2a. External planning-cohort tags — `quip*`

Tags matching the prefix `quip*` (e.g. `quip jul to oct`) are **QUIP planning-cohort tags**. They are managed by the roadmap-planning process outside Quorum, not by the Orchestrator.

- They are an **exception to the lowercase-hyphenated-no-spaces rule** above — they may contain spaces, because they predate Quorum's tag convention and are set by humans during planning.
- The Orchestrator **reads** them (by prefix match) as a trigger for the QUIP Scoring Agent (Phase 2+ — see `spec/orchestrator/AGENT_ROUTING_RULES.md` §5b). It does **not create, edit, or remove** them.
- They are not state tags and never affect the go/no-go gate chain. Presence of a `quip*` tag never advances, blocks, or closes a ticket.

---

## 3. How the Orchestrator reads state

Before taking any action on a ticket, the Orchestrator reads in this exact order:

1. **ClickUp status** — which stage is the ticket in?
2. **`closed` tag** — if present, stop. Closed tickets are never acted on regardless of status.
3. **`human-review-required` tag** — if present, stop. Do nothing. Wait for Product Manager.
4. **Progress tags** — what has already been completed? This determines what to do next.
5. **State tags** — is `awaiting-info`, `stalled`, or `duplicate-suspected` active? This affects routing.
6. **Most recent Orchestrator comment** — what was last done and when? Does the intended action duplicate it?
7. **Supabase** (Phase 2) — working-day timer, chase count, last processed comment ID.

---

## 4. Routing logic — tag-driven

The daily Routine loops through all open tickets and applies this logic per ticket.

**Decision grammar:** wherever this document says "human-review-required removed", the operative trigger is an explicit Product Manager decision (chat / /gate command in Phase 1; gate_decisions record in Phase 2+). The Orchestrator removes the tag as a consequence of acting on the decision — tag absence alone never encodes which option was chosen.

### Tickets in Validation

```
Has human-review-required?
  → Stop. Waiting on Product Manager.

Has awaiting-info?
  → Check for new submitter replies since last Orchestrator comment
  → Sufficient answers received:
      Remove awaiting-info
      Remove stalled (if present)
      Continue to next check below
  → No answer yet:
      Check working-day timer (Supabase / Phase 1: count from question date in comment)
      Day 3: post T-04 chase comment, add stalled tag
      Day 6: post T-05 chase comment
      Day 9: post T-06 park recommendation, add human-review-required
      Stop.

No awaiting-info, no coe-pass-1-complete?
  → Run Demand Signal Agent
  → Return output to Supabase (never auto-write to ClickUp)
  → Add human-review-required (Product Manager grades evidence)
  → Stop. Wait.

human-review-required removed, no coe-pass-1-complete?
  → Demand Signal has been graded
  → Run CoE Pass 1 (6 personas: PM, Analyst, Commercial, Product Marketing, CSM, Contrarian)
  → Add coe-pass-1-complete
  → Add human-review-required
  → Move status to COE Review
  → Stop. Wait.
```

### Tickets in COE Review

```
Has human-review-required?
  → Stop. Waiting on Product Manager go/no-go decision.

human-review-required removed?
  → Product Manager has decided
  → If Go: move status to Define & Design, remove human-review-required
  → If No-Go: add tag `closed`, status unchanged, post closure comment
  → If Validate Further: remain at COE Review, post follow-up request
```

### Tickets in Define & Design

```
Has human-review-required?
  → Stop. Waiting on Product Manager.

No requirements-added?
  → Run Requirements Agent
  → Add requirements-added
  → Add human-review-required (soft gate — Product Manager reviews before CoE Pass 2)
  → Stop. Wait.

Has requirements-added, human-review-required removed, no coe-pass-2-complete?
  → Check bau-cr-signal tag
  → If bau-cr-signal: add human-review-required (Gate 6a — BAU/CR confirmation)
      → Confirmed: remove bau-cr-signal, add bau-cr, move → Ready for Scheduling
      → Rejected: remove bau-cr-signal, run CoE Pass 2
  → If no bau-cr-signal: Run CoE Pass 2 (all 13 personas)
      → Add coe-pass-2-complete
      → Add human-review-required
      → Stop. Wait.

Has coe-pass-2-complete, human-review-required removed, no solution-added?
  → Run Solution Shaping Agent (Phase 4 — skip in Phase 1/2/3)
  → Add solution-added
  → Add human-review-required
  → Stop. Wait.

Has solution-added (or Phase < 4), human-review-required removed?
  → Run Delivery Readiness check
  → Pass: move status to Ready for Scheduling, add human-review-required (hard gate)
  → Fail: add human-review-required with specific gaps listed
```

### Tickets in Ready for Scheduling

```
Has human-review-required?
  → Stop. Waiting on Product Manager final approval.

human-review-required removed?
  → Product Manager has approved
  → Move status to Scheduled
  → Record handoff in Supabase
  → No further Orchestrator action on this ticket
```

---

## 4a. Demand Signal — optional invocation

Demand Signal Agent (Mode A, Orchestrator-managed) is not a mandatory gate. It is invoked on demand by the Product Manager while a ticket is at Triage or Validation, using the same Mode A behaviour defined in spec/agents/DEMAND_SIGNAL_AGENT.md (output returns to Orchestrator, graded, presented for review, written back via T-07 only after approval).

**If Demand Signal is never invoked:** CoE Pass 1 runs on ticket content and Requirements context alone. The Pass 1 council output must include an explicit line: "No demand signal evidence assessed for this ticket." This is not optional — silent proceeding without the declaration is a governance failure, same standard as the Lenses Not Represented rule for reduced CoE Pass 2 councils.

**If Demand Signal is invoked and grades Low:** Gate 3 (hard gate) applies exactly as before — invoking it does not weaken the low-evidence escalation.

**If Demand Signal is invoked and grades Medium or High:** proceeds as before via Gate 2 soft review and T-07 write-back.

## 4b. Closure handling

When any gate resolves in rejection, confirmed duplicate, or park (Gate 1, Gate 3 "do not proceed", Gate 4 No-Go, Gate 8 Reject, or any exception-flow closure), the Orchestrator:
1. Adds the tag `closed`.
2. Does NOT change ClickUp status — the ticket remains at its current status.
3. Posts the appropriate T-16 (or T-10 for CoE Pass 1 No-Go) closure comment stating the reason.
4. Records the closure in the audit log (Supabase `audit_log` and `workflow_runs`).

**Reopening:** if the Product Manager removes the `closed` tag, the ticket is live again at whatever status it sits at. The Orchestrator re-applies the pre-action check (read status, read tags, read most recent comment) before taking any further action — it does not assume where the ticket "should" resume from.

**Pre-action check addition:** every pre-action check (spec/orchestrator/CLICKUP_STATE_MODEL.md §3, spec/orchestrator/AGENT_ROUTING_RULES.md §2) must check the `closed` tag immediately after `human-review-required`. If `closed` is present, stop — the Orchestrator never acts on a closed ticket regardless of status.

---

## 5. Status transition map

```
Submitted
  ↓
Intake Agent runs
  ├─ Complete, no duplicate → Validation
  ├─ Clarification needed → Validation + add awaiting-info
  └─ Duplicate suspected → Submitted (hold) + add duplicate-suspected + human-review-required

Validation
  ├─ awaiting-info resolved → continue in Validation (remove awaiting-info + stalled)
  ├─ Stall Day 3 → add stalled
  ├─ Stall Day 9 → add human-review-required (park recommendation)
  ├─ Demand Signal graded → add human-review-required
  └─ CoE Pass 1 complete → add coe-pass-1-complete + human-review-required → COE Review

COE Review
  ├─ Go → Define & Design (remove human-review-required)
  ├─ No-Go → add `closed` tag
  └─ Validate Further → remain COE Review

Define & Design
  ├─ Requirements complete → add requirements-added + human-review-required (soft gate)
  ├─ bau-cr confirmed → add human-review-required → Ready for Scheduling
  ├─ CoE Pass 2 complete → add coe-pass-2-complete + human-review-required
  ├─ Solution Shaping complete (Phase 4) → add solution-added + human-review-required
  └─ Rejected at any gate → add `closed` tag

Ready for Scheduling
  └─ Product Manager approves → Scheduled (remove human-review-required)

Scheduled
  (Orchestrator does not act)

closed tag
  (terminal tag — no further Orchestrator action)
```

---

## 6. Loop prevention

### Phase 1 (comment-based)

Before posting any comment or taking any action, read the most recent comment on the ticket.

If it carries the `🤖 PDLC Orchestrator` attribution header AND was posted today AND the action you are about to take matches what that comment describes: stop. Do not repeat.

### Phase 2 (Supabase-based)

Supabase stores `last_processed_comment_id` per ticket. On each Routine run, after reading a ticket's comments, store the ID of the most recent comment. On the next run, only process comments newer than `last_processed_comment_id`. If the most recent comment was authored by the Orchestrator, do not re-trigger from it.

---

## 7. ClickUp lists in scope

| Product | List ID |
|---|---|
| AvailabilityInsight | `901209020398` |
| InventoryInsight | `901204771890` |

WasteInsight (`900501325170`) — intake-only in Phase 1. Not orchestrated. Do not create Quorum tags or run the Routine against this list.

Always use List IDs. Never resolve by name in MCP calls or agent logic.

---

## 8. Phase 2 — Supabase additions

In Phase 2, Supabase is added as the orchestration memory layer. ClickUp statuses and tags remain the team-visible state. Supabase adds:

| Data | Purpose |
|---|---|
| `last_processed_comment_id` | Loop prevention |
| `working_day_timer` | Stall detection — counts working days only, excludes weekends |
| `chase_count` | How many chases have been sent |
| `agent_outputs` | Full unfiltered output from every agent — never written to ClickUp directly |
| `demand_signal_pending_review` | Demand Signal output awaiting Product Manager grading |
| `human_gate_status` | Which gate is active, when it opened |
| `audit_log` | Every Orchestrator decision with timestamp |

The Supabase MCP connector is used directly by the Claude Code Routine. No custom backend code is needed.

See `schema/SUPABASE_SCHEMA.md` for full Phase 2 schema.

---

## 9. Pre-Phase 1 checklist

These must be done before the Claude Project is configured:

- [ ] Confirm all 9 live statuses exist and record their exact API string values (Submitted, Triage, Validation, COE Review, Define & Design, Ready for Scheduling, Scheduled, Build & Deploy, Release & GTM).
- [ ] Create all tags on both lists: `closed`, `human-review-required`, `awaiting-info`, `stalled`, `duplicate-suspected`, `bau-cr-signal`, `bau-cr`, `coe-pass-1-complete`, `requirements-added`, `coe-pass-2-complete`, `solution-added`
- [ ] Confirm ClickUp MCP supports tag add/remove write operations
- [ ] Confirm `closed` tag exists on both in-scope lists.
- [ ] Confirm exact ClickUp status strings including numbering (e.g. "Submitted", "COE Review") — MCP status writes require exact match

- [ ] Identify 3–5 real test tickets for Phase 1 validation
