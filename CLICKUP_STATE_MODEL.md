# CLICKUP_STATE_MODEL.md
## PDLC Orchestrator — ClickUp State Model
**Version:** 4.0 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. ClickUp Statuses

Seven visible statuses. These are the only statuses the Orchestrator uses. They map to existing CoE lifecycle statuses where possible.

| # | Status | Orchestrator role |
|---|---|---|
| 1 | Submitted | Intake Agent fires here |
| 2 | Validation | Clarification, stall management, Demand Signal, CoE Pass 1 all happen here — tags carry the detail |
| 3 | Product Review | CoE Pass 1 complete — hard gate for Head of Product go/no-go |
| 4 | Define & Design | Requirements Agent and CoE Pass 2 fire here |
| 5 | Delivery Ready | All gates passed — hard gate before handoff to scheduling |
| 6 | Scheduled / Build | Human-controlled — Orchestrator does not act |
| 7 | Closed | Terminal status — parked, rejected, duplicate, or released |

**Closed** is the single terminal status. All tickets that stop moving for any reason go to Closed. The reason is recorded in the final Orchestrator comment and in Supabase.

There is no separate Parked, Rejected, or Duplicate status. These are states within Closed, distinguished by tags and the closure comment.

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
| `bau-cr` | Head of Product confirms BAU/CR classification at Gate 6a | Never |

### State tags — removed when no longer relevant

| Tag | Added when | Removed when |
|---|---|---|
| `awaiting-info` | Orchestrator posts clarification questions | Submitter provides sufficient answers |
| `stalled` | Day 3 working-day timer fires with no reply | Submitter provides answers or ticket is Closed |
| `duplicate-suspected` | Intake Agent flags possible duplicate | Head of Product resolves the gate |
| `bau-cr-signal` | Orchestrator identifies BAU/CR signal from Requirements output | Head of Product confirms (→ swap to `bau-cr`) or rejects (tag removed, standard path) |

### Action tag — tells Head of Product something needs their decision

| Tag | Added when | Removed when |
|---|---|---|
| `human-review-required` | Any gate becomes active | Head of Product provides a decision and Orchestrator acts on it |

---

## 3. How the Orchestrator reads state

Before taking any action on a ticket, the Orchestrator reads in this exact order:

1. **ClickUp status** — which stage is the ticket in?
2. **`human-review-required` tag** — if present, stop. Do nothing. Wait for Head of Product.
3. **Progress tags** — what has already been completed? This determines what to do next.
4. **State tags** — is `awaiting-info`, `stalled`, or `duplicate-suspected` active? This affects routing.
5. **Most recent Orchestrator comment** — what was last done and when? Does the intended action duplicate it?
6. **Supabase** (Phase 2) — working-day timer, chase count, last processed comment ID.

---

## 4. Routing logic — tag-driven

The daily Routine loops through all open tickets and applies this logic per ticket.

**Decision grammar:** wherever this document says "human-review-required removed", the operative trigger is an explicit Head of Product decision (chat / /gate command in Phase 1; gate_decisions record in Phase 2+). The Orchestrator removes the tag as a consequence of acting on the decision — tag absence alone never encodes which option was chosen.

### Tickets in Validation

```
Has human-review-required?
  → Stop. Waiting on Head of Product.

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
  → Add human-review-required (Head of Product grades evidence)
  → Stop. Wait.

human-review-required removed, no coe-pass-1-complete?
  → Demand Signal has been graded
  → Run CoE Pass 1 (6 personas: PM, Analyst, Commercial, Product Marketing, CSM, Contrarian)
  → Add coe-pass-1-complete
  → Add human-review-required
  → Move status to Product Review
  → Stop. Wait.
```

### Tickets in Product Review

```
Has human-review-required?
  → Stop. Waiting on Head of Product go/no-go decision.

human-review-required removed?
  → Head of Product has decided
  → If Go: move status to Define & Design, remove human-review-required
  → If No-Go: move status to Closed, post closure comment
  → If Validate Further: remain at Product Review, post follow-up request
```

### Tickets in Define & Design

```
Has human-review-required?
  → Stop. Waiting on Head of Product.

No requirements-added?
  → Run Requirements Agent
  → Add requirements-added
  → Add human-review-required (soft gate — Head of Product reviews before CoE Pass 2)
  → Stop. Wait.

Has requirements-added, human-review-required removed, no coe-pass-2-complete?
  → Check bau-cr-signal tag
  → If bau-cr-signal: add human-review-required (Gate 6a — BAU/CR confirmation)
      → Confirmed: remove bau-cr-signal, add bau-cr, move → Delivery Ready
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
  → Pass: move status to Delivery Ready, add human-review-required (hard gate)
  → Fail: add human-review-required with specific gaps listed
```

### Tickets in Delivery Ready

```
Has human-review-required?
  → Stop. Waiting on Head of Product final approval.

human-review-required removed?
  → Head of Product has approved
  → Move status to Scheduled / Build
  → Record handoff in Supabase
  → No further Orchestrator action on this ticket
```

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
  └─ CoE Pass 1 complete → add coe-pass-1-complete + human-review-required → Product Review

Product Review
  ├─ Go → Define & Design (remove human-review-required)
  ├─ No-Go → Closed
  └─ Validate Further → remain Product Review

Define & Design
  ├─ Requirements complete → add requirements-added + human-review-required (soft gate)
  ├─ bau-cr confirmed → add human-review-required → Delivery Ready
  ├─ CoE Pass 2 complete → add coe-pass-2-complete + human-review-required
  ├─ Solution Shaping complete (Phase 4) → add solution-added + human-review-required
  └─ Rejected at any gate → Closed

Delivery Ready
  └─ Head of Product approves → Scheduled / Build (remove human-review-required)

Scheduled / Build
  (Orchestrator does not act)

Closed
  (terminal — no further Orchestrator action)
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
| `demand_signal_pending_review` | Demand Signal output awaiting Head of Product grading |
| `human_gate_status` | Which gate is active, when it opened |
| `audit_log` | Every Orchestrator decision with timestamp |

The Supabase MCP connector is used directly by the Claude Code Routine. No custom backend code is needed.

See `SUPABASE_SCHEMA.md` for full Phase 2 schema.

---

## 9. Pre-Phase 1 checklist

These must be done before the Claude Project is configured:

- [ ] Confirm all 7 statuses exist on both AvailabilityInsight and InventoryInsight lists
- [ ] Create all tags on both lists: `human-review-required`, `awaiting-info`, `stalled`, `duplicate-suspected`, `bau-cr-signal`, `bau-cr`, `coe-pass-1-complete`, `requirements-added`, `coe-pass-2-complete`, `solution-added`
- [ ] Confirm ClickUp MCP supports tag add/remove write operations
- [ ] Confirm `Closed` status exists on both lists
- [ ] Confirm exact ClickUp status strings including numbering (e.g. "1. Submitted", "3. Product Review") — MCP status writes require exact match

- [ ] Identify 3–5 real test tickets for Phase 1 validation
