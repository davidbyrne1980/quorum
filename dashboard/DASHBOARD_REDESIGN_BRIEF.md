# Quorum Dashboard — Redesign Brief

A brief for redesigning the Quorum dashboard. Everything here is drawn from the live
Quorum spec (`QUORUM.md`, `spec/orchestrator/*`). The audience for the dashboard is a
**Product Manager / Head of Product**. The dashboard is **read-only** — it displays state,
it never writes back to ClickUp or to run files. All decisions happen inside Claude Code
(the Orchestrator), never in the browser.

---

## 1. What Quorum is

Quorum is Retail Insight's **Product Ops workflow spine**. It controls how a product idea
(a ClickUp ticket) moves from submission to being scheduled for build:

- **The Orchestrator** (Claude, with ClickUp access) reads ticket state, routes to the
  right specialist **agent**, enforces **human approval gates**, and records every decision.
- **Agents** (Intake, Demand Signal, CoE Pass 1/2, Requirements, QUIP Scoring, Solution
  Shaping) each produce a **markdown artefact** into the ticket's run folder.
- **The Head of Product** is the sole human approver. Nothing advances past a gate without
  their explicit decision.

A ticket flows through **stages** (ClickUp statuses), with **tags** as the fine-grained state
signal, pausing at **gates** for human input. Each pass of work is a **run**; a ticket can
have several runs over its life, but exactly one persistent **context journal**.

---

## 2. The states

There are three layers of state. The dashboard must surface all three.

### 2a. Roadmap stages (ClickUp statuses)

Quorum orchestrates the first six; the last three are out of scope (never read/written).

| # | Status | Meaning | Orchestrator role |
|---|--------|---------|-------------------|
| 1 | **Submitted** | Idea just created | Intake Agent runs |
| 2 | **Triage** | Optional deeper dig | Often skipped |
| 3 | **Validation** | PM sanity-check; clarification & stall handling | Demand Signal (optional), CoE Pass 1 |
| 4 | **COE Review** | Early challenge complete | Hard gate: go/no-go |
| 5 | **Define & Design** | Requirements + full council | Requirements, CoE Pass 2, QUIP scoring, BAU/CR |
| 6 | **Ready for Scheduling** | All gates passed | Hard gate: final approval |
| 7 | **Scheduled** | Handed off to delivery | Orchestrator stops |
| 8 | Build & Deploy | — | **Out of scope** |
| 9 | Release & GTM | — | **Out of scope** |

There is **no terminal status**. A stopped ticket keeps its last status and gets a `closed` tag.

### 2b. Tags (the real state detail — the dashboard should read these, not just status)

**Progress tags — permanent once set (what the ticket has completed):**
`coe-pass-1-complete` · `requirements-added` · `coe-pass-2-complete` · `solution-added` · `bau-cr`

**State tags — removed when no longer relevant (what it's waiting on):**
`awaiting-info` (waiting on submitter) · `stalled` (submitter not responding) ·
`duplicate-suspected` · `bau-cr-signal`

**Action / terminal tags:**
`human-review-required` (a gate is open — waiting on the Head of Product) ·
`closed` (stopped — rejected / duplicate / parked)

**External planning tags:** `quip*` (e.g. `quip jul to oct`) — QUIP planning-cohort tags,
managed outside Quorum, matched by prefix.

### 2c. Reading order (how the Orchestrator interprets a ticket)

1. Status → 2. `closed`? (stop) → 3. `human-review-required`? (waiting on me) →
4. progress tags (what's done) → 5. state tags (what it's waiting on) → 6. last comment.

---

## 3. Human-in-the-loop phases (gates)

Gates are where a human must act. **Hard gate** = Orchestrator stops dead until a decision.
**Soft gate** = pauses forward progress for review, but timers keep running. Whenever any gate
is open, the ticket carries `human-review-required`.

| Gate | Name | Type | At status | Waiting on |
|------|------|------|-----------|-----------|
| 0 | Clarification Questions Review | Soft | Submitted→Validation | **Me** (approve questions) |
| 1 | Suspected Duplicate | Hard | Submitted | **Me** (resolve) |
| 2 | Demand Signal Review | Soft | Validation | **Me** (grade evidence) |
| 3 | Low Demand Signal Escalation | Hard | Validation | **Me** (proceed?) |
| 4 | CoE Pass 1 Go / No-Go | Hard | COE Review | **Me** (go/no-go) |
| 5 | Requirements Review | Soft | Define & Design | **Me** (approve + council roster) |
| 6a | BAU/CR Confirmation | Hard | Define & Design | **Me** (confirm fast-track) |
| 6b | Conflicting Evidence | Hard | Any | **Me** (pick source) |
| 7 | CoE Pass 2 Review | Soft | Define & Design | **Me** (approve council output) |
| 8 | Ready for Scheduling Approval | Hard | Ready for Scheduling | **Me** (final approve) |
| 9 | Stall Day-9 Park | Hard | Validation | **Me** (close/extend) — triggered by **others** not replying |
| 10 | Agent Failure | Hard | Any | **Me** (re-run/halt) |

**Key distinction for the PM view:**
- **Awaiting me (the Head of Product)** = `human-review-required` present → an open gate. This
  is the decision inbox.
- **Awaiting others (the submitter)** = `awaiting-info` or `stalled` present → chasing input
  from the person who raised the idea.
- **In progress, no input needed** = neither of the above; an agent is working or the ticket
  is between steps.

A gate open **3 working days** with no response triggers a reminder (but stays open).

---

## 4. Markdown files that could be accessible

### 4a. Per-run artefacts — `quorum-tickets/{ticket_folder}/runs/{run}/`

Standard artefacts (numbered, produced in order by the workflow):

| File | Produced by / at |
|------|------------------|
| `00_run_manifest.md` | Run registration — holds ticket id, status, current gate |
| `01_ticket_intake.md` | Intake |
| `02_context_pack.md` | Context discovery |
| `03_persona_recommendation.md` | Persona/workflow path |
| `04_clarification_questions.md` | Clarification |
| `05_requirements.md` | Requirements Agent |
| `06_solution_design.md` | Solution design |
| `07_test_plan.md` | Test planning |
| `08_human_decisions.md` | Log of every gate decision |
| `09_implementation_handoff.md` | Handoff to delivery (Codex) |
| `10_clickup_summary.md` | Final ClickUp write-up |

Non-standard lifecycle artefact:

| File | Notes |
|------|-------|
| `QUIP_score_v{n}.md` | Roadmap-prioritisation score, versioned per ticket. Carries a machine-readable `**Score Status:**` line (`final` / `provisional-thin-data` / `provisional-open-questions`) and an `## Open Clarification Questions` block behind a `<!-- quip:open-questions -->` marker. |

### 4b. Per-ticket context journal — `quorum-tickets/{ticket_folder}/_journal.md`

Append-only, **one per ticket**, persists across all runs. The single source of history.
Each entry: `### [DATE] — [EVENT TYPE]` + 1–3 line summary + link to the full artefact.

Event types: `ticket_created`, `clarification_drafted`, `clarification_answered`,
`demand_signal_run`, `demand_signal_graded`, `coe_pass1_complete`, `gate_decision`,
`requirements_drafted`, `requirements_approved`, `coe_pass2_complete`,
`solution_design_drafted`, `solution_design_approved`, `implementation_handoff_approved`,
`quip_scored`, `stall`, `exception`, `closed`, `reopened`, `rerun_started`.

---

## 5. What the current HTML dashboard does

A single Node script (`generate_dashboard.cjs`) scans `quorum-tickets/`,
parses the markdown, and writes one self-contained HTML file (inline CSS/JS, no external deps).
A companion `serve_dashboard.cjs` serves it on `localhost:4319` and live-reloads on file change.

**It is run-centric.** For each *run* it renders a card with:
- Status pill + ticket id + ClickUp status + stage + artefact count
- A **pending gate** box (title, recommendation, options) — or "no gate pending"
- An **artefacts checklist** (00–10, present/absent, links to the local file)
- A **decision history** list (from `08_human_decisions.md`)
- A collapsible **context-journal timeline**
- A **QUIP score pill** and an amber **provisional-score flag** when a score has open questions

**Limitations to fix in the redesign:**
- It is **run-centric, not ticket-centric** — no roll-up of a ticket's multiple runs, and no
  portfolio view across tickets.
- **No counts / no aggregation** — you can't see "how many are in each state".
- **No "waiting on me" vs "waiting on others" split** — the gate box is per-card only.
- **No "what's next"** — it shows where a ticket is, not where it goes next.
- Sample data is tiny (2 runs); the design must scale to a real portfolio.

---

## 6. What the redesign must deliver (PM requirements)

The Head of Product's questions, mapped to the data that answers them:

### Q1 — "How many items are in each state?"
A **portfolio overview**: count of tickets grouped by roadmap stage (§2a) and/or by progress.
Must be **ticket-centric** (roll up runs by ticket id). A funnel or kanban-style column count
works well. Exclude `closed` from live counts (offer a separate "closed" tally).

### Q2 — "What's awaiting input from other people?"
A filtered list of tickets carrying `awaiting-info` / `stalled` (§3). Show who/what is being
waited on and for how long (stall day count: 3 / 6 / 9 working-day thresholds).

### Q3 — "What's awaiting input from me?"
The **decision inbox**: every ticket with `human-review-required` (§3). Show the gate name, its
type (hard/soft), how long it's been open, and the decision options. This is the most important
view — it's the PM's action list. Flag anything open > 3 working days.

### Q4 — "When I tap an item, show me everything about it"
A **ticket detail view** containing:
- **What it is** — title + objective/summary (from `00_run_manifest.md` / intake)
- **Current state** — status + active tags, in plain language ("In Define & Design, awaiting my
  approval on CoE Pass 2")
- **Artefacts produced** — the md files that exist, each openable (§4a). Include `QUIP_score`
  with its status flag.
- **What it's gone through / history** — the context-journal timeline (§4b) and the decision log
- **What's next** — the next stage/agent/gate on the standard path (see §7)

---

## 7. "What's next" — next-state derivation

The redesign should compute the next step from status + tags. Standard path:

| Current status | If… | Next |
|----------------|-----|------|
| Submitted | intake complete | → Validation |
| Validation | CoE Pass 1 not done | → CoE Pass 1 → COE Review |
| COE Review | gate 4 pending | → (Go) Define & Design |
| Define & Design | no `requirements-added` | → Requirements Agent (Gate 5) |
| Define & Design | `requirements-added`, `bau-cr-signal` | → Gate 6a → Ready for Scheduling |
| Define & Design | `requirements-added`, no BAU/CR | → CoE Pass 2 (Gate 7) → Delivery Readiness |
| Ready for Scheduling | gate 8 pending | → (Approve) Scheduled |
| Scheduled | — | Orchestrator done |
| any + `closed` | — | Stopped (reopen removes `closed`) |

---

## 8. Data & constraints for the design

- **Source of truth:** local markdown in `quorum-tickets/`. The current
  generator already parses these; a redesign can extend the parser to emit a JSON model
  (tickets → runs → artefacts / journal / decisions / gate / quip) and render from that.
- **Read-only, always.** No buttons that write state. Decision options may be *shown*, with a
  note that decisions are made in Claude Code.
- **Ticket-centric model:** key on ClickUp ticket id; group runs beneath it; the context journal
  is the per-ticket spine.
- **Self-contained output** is the current convention (one HTML file, inline assets) so it can be
  opened from disk on Windows and file links resolve locally — keep this unless there's a strong
  reason to change.
- **Scale:** design for tens–hundreds of tickets, not the 2 sample runs.
- **Brand:** Retail Insight (there's an RI brand/PPTX skill in the workspace if brand tokens are
  needed).

---

## 9. Suggested primary layout (starting point, not prescriptive)

1. **Top bar:** portfolio counts per stage (Q1) + two badges: "Awaiting me: N" (Q3),
   "Awaiting others: N" (Q2).
2. **Decision inbox** (Q3) as the hero section — the PM's action list.
3. **Pipeline / kanban** by stage (Q1), each ticket a card showing state + next step.
4. **Ticket detail** (Q4) as a drawer/panel on tap: what · state · artefacts (openable) ·
   history (journal + decisions) · next.
5. Secondary: "awaiting others" and "closed" lists.
