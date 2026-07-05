# CODEX_PATCH_PACK_4.md
## Quorum — Patch 15: Live ClickUp Status Remap, Optional Demand Signal, Closed Tag
**Version:** 1.0 | **Date:** 05 Jul 2026
**Depends on:** CODEX_PATCH_PACK.md, _2.md, _3.md (apply those first)

**Design decisions encoded (confirmed by Head of Product):**
- Canonical status model changes from 7 statuses to match live ClickUp (8 statuses Quorum touches, 2 beyond that are fully out of scope).
- `Triage` is a real status between Submitted and Validation — currently often skipped in practice.
- `COE REVIEW` = today's `Product Review` (rename only — same gate, same role).
- `READY FOR SCHEDULING` = today's `Delivery Ready` (rename only — same gate, same role).
- `SCHEDULED` = today's `Scheduled / Build` boundary. `BUILD & DEPLOY` and `RELEASE & GTM` are fully out of Orchestrator scope — no read, no write, ever.
- Demand Signal Agent (Mode A, Orchestrator-managed) is no longer a mandatory gate before CoE Pass 1. It becomes optional — invoked on demand at Validation or Triage. When CoE Pass 1 runs without it, the council output must explicitly declare no demand-signal evidence was assessed. If Demand Signal IS run and grades Low, Gate 3 (hard gate) still applies unchanged.
- There is no `Closed` ClickUp status. Closure is recorded via a new tag `closed`. Tickets remain at their last live status when closed. All pipeline/dashboard views must filter live vs dead tickets by the `closed` tag, not by status.

**Instruction to Codex:** Single backticks throughout, literal. Where an exact find string is impractical because the change is structural (the status table, the routing tree), the patch gives a "replace section" instruction naming the exact section to replace wholesale — apply those as full section replacements, preserving surrounding headers exactly as given. Rule 5 stands: if a targeted find string fails to match, stop and report; do not improvise.

---

## PATCH 15a — CLICKUP_STATE_MODEL.md (canonical source of the status model)

### 15a-1 — Replace §1 entirely
Replace the full §1 (ClickUp Statuses) section, from its heading down to (not including) the §2 heading, with:

`## 1. ClickUp Statuses

Nine live ClickUp statuses. Quorum orchestrates the first six. The final three are fully out of Orchestrator scope — no read, no write, ever.

| # | Status (live ClickUp string) | Orchestrator role |
|---|---|---|
| 1 | Submitted | Intake Agent fires here |
| 2 | Triage | Optional deeper-dig stage. Frequently skipped in practice — tickets may move directly from Submitted/Validation to COE Review. The Orchestrator does not force a ticket through Triage. Demand Signal Agent may be invoked here on demand (see §4a). |
| 3 | Validation | PM sanity check that the idea is valid to progress. Clarification and stall management happen here. Demand Signal Agent may be invoked here on demand (see §4a) — no longer mandatory. |
| 4 | COE Review | CoE Pass 1 runs here — hard gate for Head of Product go/no-go (Gate 4, same role as the former "Product Review" name) |
| 5 | Define & Design | Requirements Agent and CoE Pass 2 fire here |
| 6 | Ready for Scheduling | All gates passed — hard gate before handoff (Gate 8, same role as the former "Delivery Ready" name) |
| 7 | Scheduled | Orchestrator scope ends here. No further Orchestrator action. |
| 8 | Build & Deploy | **Out of scope.** Orchestrator never reads or writes tickets at this status. |
| 9 | Release & GTM | **Out of scope.** Orchestrator never reads or writes tickets at this status. |

**There is no terminal ClickUp status.** Closure (rejected, duplicate, parked, or otherwise stopped) is recorded via the tag `closed` — the ticket remains at its last live status. See §2 for the tag and §4a for closure handling. Any pipeline or dashboard view distinguishing live from dead tickets must filter on the `closed` tag, not on status.

Exact live string capitalisation must be confirmed against the ClickUp API response (not the UI display) before any MCP write. Update this table with the confirmed literal strings if they differ from the Title Case shown above.`

### 15a-2 — §2 tags table: add `closed`
In the **Action tag** table (the one currently containing only `human-review-required`), add a row:

`| `closed` | Ticket is rejected, confirmed duplicate, parked, or otherwise terminated | Never automatically. Only if the Head of Product explicitly reopens the ticket. |`

Rename the table heading from "Action tag" to "Action and terminal tags" if a single heading covers both, or add a new **Terminal tag** sub-heading above the `closed` row — whichever fits the existing document structure with the least disruption.

### 15a-3 — §4 Routing logic: replace `Product Review` and `Delivery Ready` header names
Throughout §4, replace the sub-heading `### Tickets in Product Review` with `### Tickets in COE Review` and `### Tickets in Delivery Ready` with `### Tickets in Ready for Scheduling`. Do not change the routing logic beneath these headings — only the status name in the heading and any inline references to `Product Review` / `Delivery Ready` as status names within that logic.

### 15a-4 — New §4a — Demand Signal is optional; Closure via tag
Insert a new section after §4 (Routing logic), before §5:

`## 4a. Demand Signal — optional invocation

Demand Signal Agent (Mode A, Orchestrator-managed) is not a mandatory gate. It is invoked on demand by the Head of Product while a ticket is at Triage or Validation, using the same Mode A behaviour defined in DEMAND_SIGNAL_AGENT.md (output returns to Orchestrator, graded, presented for review, written back via T-07 only after approval).

**If Demand Signal is never invoked:** CoE Pass 1 runs on ticket content and Requirements context alone. The Pass 1 council output must include an explicit line: "No demand signal evidence assessed for this ticket." This is not optional — silent proceeding without the declaration is a governance failure, same standard as the Lenses Not Represented rule for reduced CoE Pass 2 councils.

**If Demand Signal is invoked and grades Low:** Gate 3 (hard gate) applies exactly as before — invoking it does not weaken the low-evidence escalation.

**If Demand Signal is invoked and grades Medium or High:** proceeds as before via Gate 2 soft review and T-07 write-back.

## 4b. Closure handling

When any gate resolves in rejection, confirmed duplicate, or park (Gate 1, Gate 3 "do not proceed", Gate 4 No-Go, Gate 8 Reject, or any exception-flow closure), the Orchestrator:
1. Adds the tag `closed`.
2. Does NOT change ClickUp status — the ticket remains at its current status.
3. Posts the appropriate T-16 (or T-10 for CoE Pass 1 No-Go) closure comment stating the reason.
4. Records the closure in the audit log (Supabase `audit_log` and `workflow_runs`).

**Reopening:** if the Head of Product removes the `closed` tag, the ticket is live again at whatever status it sits at. The Orchestrator re-applies the pre-action check (read status, read tags, read most recent comment) before taking any further action — it does not assume where the ticket "should" resume from.

**Pre-action check addition:** every pre-action check (CLICKUP_STATE_MODEL.md §3, AGENT_ROUTING_RULES.md §2) must check the `closed` tag immediately after `human-review-required`. If `closed` is present, stop — the Orchestrator never acts on a closed ticket regardless of status.`

---

## PATCH 15b — AGENT_ROUTING_RULES.md

### 15b-1 — Pre-action check
In §2, find:

`2. Check for `human-review-required` tag → **if present, stop immediately**`

Replace with:

`2. Check for `closed` tag → **if present, stop immediately. Closed tickets are never acted on regardless of status.**
3. Check for `human-review-required` tag → **if present, stop immediately**`

(Renumber the remaining list items in §2 by one.)

### 15b-2 — Status headings
Throughout §3, replace `### Status: Product Review` with `### Status: COE Review` and `### Status: Delivery Ready` with `### Status: Ready for Scheduling`. Do not alter the logic beneath — only the heading text and inline status-name references within.

### 15b-3 — Demand Signal mandatory language
In §3, section **Status: Validation — no `awaiting-info`, no `coe-pass-1-complete`**, replace the entire section body (from `**Check first:**` through the end of "Path B") with:

`**Demand Signal is optional — invoked on demand, not automatically.**

If the Head of Product invokes Demand Signal Agent (at Triage or Validation): follow Path A/B below.
If Demand Signal is not invoked: proceed directly to CoE Pass 1 (see §3 CoE Pass 1 invocation below), with the council output declaring "No demand signal evidence assessed for this ticket."

**Path A — Demand Signal invoked, not yet graded:**

Agent searches: ClickUp, Confluence, Slack, Jira, HubSpot.
Output returned to Orchestrator → stored in Supabase → not written to ClickUp yet.
Add `human-review-required`. Present the full graded output in chat (Phase 1); nothing posts to ClickUp pre-approval.
Stop. Wait for Head of Product to grade evidence.

**Special case — overall grade Low:** Gate 3 fires. Hard gate. Head of Product must decide whether to proceed.

**Path B — Demand Signal invoked and graded, `human-review-required` resolved via explicit decision:**

Write filtered summary to ClickUp (T-07 template) — only after approval.
Invoke CoE Pass 1.

**CoE Pass 1 personas:** Product Manager, Analyst, Commercial, Product Marketing, Customer Success, Contrarian.

**Context passed to CoE Pass 1:**
- Full ticket content
- All comments including Q&A
- Demand Signal filtered summary if invoked, otherwise the explicit "not assessed" declaration
- Relevant Confluence docs (pre-fetched by Orchestrator)

After all 6 personas respond, produce synthesis.

Add `coe-pass-1-complete`.
Move status → COE Review.
Add `human-review-required`.
Post T-09 gate comment (must include the demand-signal-assessed-or-not declaration).
Stop. Wait.`

### 15b-4 — Closure actions throughout §3 and §4
Every instance in §3 and §4 of the pattern `Move status → Closed` (or equivalent, e.g. "post T-10 closure comment" implying a status move, "post T-16 closure comment") should be replaced with: `Add tag `closed`. Status unchanged. Post [T-10 / T-16 as applicable] closure comment.` Apply this to: the Intake duplicate-confirmed-close outcome, the Product-Review-No-Go outcome, the Demand-Signal-Low-Escalation-reject outcome, the Requirements-reject outcome, the Delivery-Ready-reject outcome, and the exception routes in §4 (conflicting evidence reject, agent failure reject).

---

## PATCH 15c — HUMAN_GATE_MODEL.md

### 15c-1 — Gate names
Throughout, rename gate location references: everywhere `**Status:** Product Review` appears, replace with `**Status:** COE Review`. Everywhere `**Status:** Delivery Ready` appears, replace with `**Status:** Ready for Scheduling`. Gate numbers (Gate 4, Gate 8, etc.) and their internal logic are unchanged — this is a status-name rename only.

### 15c-2 — Closure actions in every gate's decision table
Every decision-table cell reading `Move status → Closed. Post T-16 closure comment.` (or `Post T-10 closure comment with reason.` for Gate 4) becomes: `Add tag `closed`. Status unchanged. Post [T-16 / T-10] closure comment.` Apply across Gate 1, Gate 2, Gate 3, Gate 4, Gate 5, Gate 6b, Gate 7, Gate 8, Gate 9, Gate 10.

### 15c-3 — Gate 2/3 mandatory language
In Gate 2 (Demand Signal Review) header block, find:

`**Trigger:** Demand Signal Agent has completed its run.`

Replace with:

`**Trigger:** Demand Signal Agent has completed its run (invoked on demand by the Head of Product — no longer a mandatory stage gate; see CLICKUP_STATE_MODEL.md §4a).`

---

## PATCH 15d — CLICKUP_COMMENT_TEMPLATES.md

### 15d-1 — T-09 declaration line
In the T-09 template body, after the `**Overall recommendation:**` line, insert:

`**Demand signal evidence:** [CONTENT: "Assessed — see summary above" / "Not assessed — Demand Signal Agent was not invoked for this ticket"]`

### 15d-2 — T-16/T-10 closure comments — status note
In both T-16 and T-10, add a line near the top: `*Ticket remains at its current status; closure is recorded via the `closed` tag.*`

### 15d-3 — Status reference rule (§9, comment discipline)
Find: `8. **Status references must match.** Use only these status names: Submitted, Validation, Product Review, Define & Design, Delivery Ready, Scheduled / Build, Closed.`

Replace with: `8. **Status references must match.** Use only these status names: Submitted, Triage, Validation, COE Review, Define & Design, Ready for Scheduling, Scheduled. There is no Closed status — use the `closed` tag and state the closure reason in the comment; do not reference a status change on closure.`

---

## PATCH 15e — COE_AGENT.md

Find (from Patch 2, already-applied wording):

`**Pass 1** is invoked by the PDLC Orchestrator while the ticket is at status `2. Validation`, after the Demand Signal review gate (Gate 2/3) has been resolved by the Head of Product. On Pass 1 completion the Orchestrator moves the ticket to `3. Product Review`.`

Replace with:

`**Pass 1** is invoked by the PDLC Orchestrator while the ticket is at Triage or Validation status, whether or not Demand Signal was invoked (see CLICKUP_STATE_MODEL.md §4a — Demand Signal is optional). On Pass 1 completion the Orchestrator moves the ticket to COE Review status. The Pass 1 output must state explicitly whether demand signal evidence was assessed.`

If the find string above does not match verbatim (e.g. if it retains the old numbered-status wording from before Patch 2 was applied), locate the equivalent sentence describing Pass 1 invocation timing and status transition, and apply the same substitution logic: remove numbered-status references, make Demand Signal optional, add the assessed/not-assessed requirement.

---

## PATCH 15f — PDLC_ORCHESTRATOR_INSTRUCTIONS.md

### 15f-1 — §3 Lifecycle table
Replace the full §3 table (The PDLC Lifecycle — stages) with:

`| ClickUp Status | Orchestrator role |
|---|---|
| Submitted | Invoke Intake Agent |
| Triage | Optional deeper-dig stage — often skipped. Demand Signal may be invoked here on demand. |
| Validation | Clarification, stall management. Demand Signal may be invoked here on demand (no longer mandatory) |
| COE Review | CoE Pass 1 complete — hard gate for Head of Product go/no-go |
| Define & Design | Requirements Agent, CoE Pass 2, BAU/CR classification |
| Ready for Scheduling | All gates passed — hard gate before handoff |
| Scheduled | Orchestrator scope ends here |
| Build & Deploy | Out of scope — Orchestrator never reads or writes here |
| Release & GTM | Out of scope — Orchestrator never reads or writes here |

There is no terminal status. Closure is recorded via the `closed` tag — see §9a.`

### 15f-2 — §4 Stage Definitions: rename headers
Replace `### Product Review` heading with `### COE Review`. Replace `### Delivery Ready` heading with `### Ready for Scheduling`. Update internal prose references to these status names accordingly (e.g. "Exit: Go → Define & Design" stays; "Entry: CoE Pass 1 complete" stays).

### 15f-3 — §4 Validation stage: remove mandatory Demand Signal language
Find: `2. **Demand Signal** — run after clarification resolved, output reviewed by Head of Product before ClickUp write-back`

Replace with: `2. **Demand Signal** (optional, invoked on demand at Triage or Validation) — if run, output reviewed by Head of Product before ClickUp write-back. If not run, CoE Pass 1 proceeds without it and declares this explicitly.`

### 15f-4 — New §9a Closure Handling
Insert after §9 (Exception Handling), before §10:

`## 9a. Closure Handling

There is no terminal ClickUp status. When any gate resolves in rejection, confirmed duplicate, or park:
1. Add tag `closed`. Do not change ClickUp status.
2. Post the appropriate closure comment (T-16, or T-10 for CoE Pass 1 No-Go) stating the reason.
3. Record in Supabase audit log.

Every pre-action check tests the `closed` tag immediately after `human-review-required` — if present, stop unconditionally, regardless of status. Reopening requires the Head of Product to remove the tag explicitly; the Orchestrator then re-runs the full pre-action check before any further routing.`

### 15f-5 — §18 "What You Are Not" — no change needed. Skip.

---

## PATCH 15g — EXCEPTION_FLOWS.md

Apply the closure substitution consistently: every `Move status to `Closed`` (post-Patch-1 wording) becomes `Add tag `closed`. Status unchanged.` This includes §2.1 (Day 9 park), §2.3 (duplicate resolutions), §2.4 (conflicting evidence reject), §2.6 (agent failure reject), and the Exception Escalation Summary table in §4 where destinations are listed.

Also in §2.1, replace any remaining `Clarification` status reference (if Patch 1 missed any) with `Validation status with `awaiting-info` tag active`.

---

## PATCH 15h — BUILD_SEQUENCE.md

In §9 pre-flight checklist (added by earlier patches) and the original Phase 1 checklist, replace any "Confirm all 7 statuses exist" wording with: `Confirm all 9 live statuses exist and record their exact API string values (Submitted, Triage, Validation, COE Review, Define & Design, Ready for Scheduling, Scheduled, Build & Deploy, Release & GTM).` Remove any checklist item referring to confirming a `Closed` status exists — replace with `Confirm `closed` tag exists on both in-scope lists.`

---

## Post-patch verification checklist

- [ ] No document references `Product Review` or `Delivery Ready` as a live status name (gate *numbers* 4 and 8 are unchanged; only the status label changed)
- [ ] No document implies Demand Signal is mandatory before CoE Pass 1
- [ ] No document instructs a status change to `Closed` — all closure actions use the `closed` tag
- [ ] Pre-action check order in every routing document is: status → `closed` tag → `human-review-required` tag → progress tags → state tags → last comment
- [ ] `Build & Deploy` and `Release & GTM` appear nowhere as Orchestrator-actioned statuses
- [ ] T-09 template includes the demand-signal-assessed-or-not declaration line
- [ ] grep check: `Triage` appears as a real, named status (not a ghost term) in CLICKUP_STATE_MODEL.md, AGENT_ROUTING_RULES.md, PDLC_ORCHESTRATOR_INSTRUCTIONS.md
