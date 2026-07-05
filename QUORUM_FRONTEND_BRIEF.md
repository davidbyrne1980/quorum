# QUORUM_FRONTEND_BRIEF.md
## Quorum — React Dashboard Design Brief
**Version:** 1.0 | **For:** Early design concepts (Google / Figma)
**Audience:** Designer reviewing this brief to produce early wireframes and UI concepts

---

## 1. What Quorum Is

Quorum is an AI-native product governance platform. It takes product ideas through a governed pipeline — evidence validation, a 13-persona governance council, requirements, and eventually a GitHub pull request. The React dashboard is the human-facing control layer. It is where the Head of Product reviews agent outputs, approves or rejects gates, monitors the pipeline, and captures feedback that makes the system smarter over time.

**The dashboard does not replace ClickUp.** ClickUp remains the team-facing work surface. The dashboard is for the product governance layer — richer, more structured, and agent-aware in a way ClickUp is not.

**Users in v1:** Head of Product only. Future versions expand to SLT visibility and wider team access.

---

## 2. Core Design Principles

**Governance first.** Every screen should make it clear what decision is needed, who made it, and when. The system governs product decisions — the UI should feel authoritative, not casual.

**Evidence is everything.** Every recommendation the system makes is backed by evidence. The UI must make evidence visible, gradeable, and traceable. Users should never have to trust the system blindly.

**Human in the loop.** AI advances the work. Humans own the decisions. Gates are prominent. The approver's name and timestamp appear on every decision. The system never implies AI approved something.

**Calm and focused.** This is a serious governance tool, not a consumer app. No gamification. No celebration animations. Clean, professional, high information density where needed, generous whitespace where not.

**Mobile-aware but desktop-first.** The Head of Product will primarily use this at a desk. Mobile should work for quick gate approvals and pipeline checks.

---

## 3. Navigation Structure

```
Quorum
├── Pipeline          — all in-flight tickets, status overview
├── Gates             — active decisions requiring Head of Product action
├── Tickets           — individual ticket view (all detail)
├── Evidence Browser  — cross-ticket evidence and demand signal library
├── Council           — CoE council output browser
├── Experts           — domain expert map and consultation suggestions
├── Learning          — agent feedback, prompt versions, outcomes
└── Settings          — agent configuration, prompt management
```

---

## 4. Screen-by-Screen Requirements

---

### 4.1 Pipeline View

**Purpose:** At-a-glance view of every in-flight ticket. The Head of Product's morning check.

**What to show:**

- All tickets grouped by ClickUp status (1. Submitted, 2. Validation, 3. Product Review, 4. Define & Design, 5. Delivery Ready, 6. Scheduled / Build)
- Per ticket: title, product (AI/II/WI badge), client name if applicable, current stage (granular — not just status), time in current stage, whether a gate is active
- Colour or badge system for gate state: gate active (prominent, action needed), no gate (normal), stalled (warning)
- Filter by: product, client, stage, gate active, BAU/CR flag
- Sort by: time in stage (oldest first by default), recently updated, client name

**What NOT to show:**
- Scheduled, Build & Deploy, Release & GTM tickets — these are human-controlled and clutter the view
- Parked tickets — separate view if needed, not the default

**Key interactions:**
- Click any ticket → goes to Ticket Detail view
- Gate active badge → goes directly to Gate Review screen for that ticket
- Onboard button → trigger `/onboard` for a ticket not yet in Quorum

**Visual concept:**
Kanban-style columns OR a prioritised list view — designer's call based on information density. The gate active state should be impossible to miss.

---

### 4.2 Gates View

**Purpose:** Everything requiring a Head of Product decision, in one place. This is the most action-critical screen.

**What to show:**

- All active gates across all tickets
- Per gate: ticket title, gate type (hard/soft badge), gate name, what decision is required, how long the gate has been active, AI recommendation
- Grouped by gate type: Hard Gates first (prominent), Soft Gates below
- Each gate card shows: the AI recommendation prominently, the decision options as clear buttons

**Gate card structure:**
```
[Hard Gate] CoE Pass 1 — Go / No-Go            Active 2 days
Ticket: Automated Reorder Suggestions — InventoryInsight

AI Recommendation: Validate Further
"Evidence grade is Medium. Commercial concern about single-client framing
is valid. Analyst recommends additional cross-client validation before
committing to council review."

[ Approve — Go ]  [ Reject — No-Go ]  [ Validate Further ]  [ View Full Output ]
```

**Key interactions:**
- Approve / Reject / other decision buttons → opens confirmation modal with space for rationale → records decision with timestamp and approver name
- View Full Output → opens full agent output in a side panel or separate view
- Rationale is required for Hard Gates, optional for Soft Gates

**Important:** Decision buttons should require confirmation. A hard gate approval is consequential — it should not be a single click.

---

### 4.3 Ticket Detail View

**Purpose:** The full picture for a single ticket. Everything Quorum knows about it.

**Structure — tabbed or sectioned:**

**Tab 1 — Overview**
- Ticket title, product, client, current stage, BAU/CR flag
- Timeline of every stage transition with dates
- Active gate (if any) with decision UI inline
- Agent run history: which agents have run, when, status (complete / partial / failed), confidence level

**Tab 2 — Evidence**
- Full demand signal output
- Evidence items in a table: source, summary, grade (High/Medium/Low), thumbs up/down feedback buttons
- Discarded items shown separately (greyed, with discard reason)
- Signal Strength (Isolated/Emerging/Established) and Evidence Quality (Anecdotal/Observational/Quantified) displayed prominently
- Suggested expert consultations from this ticket's demand signal run

**Tab 3 — Council**
- CoE Pass 1 output (if run): each persona's position as a badge, expandable to full response
- CoE Pass 2 output (if run): Round 1 and Round 2 per persona, Position Evolution Summary
- Position badges: colour-coded (Hard Block = red, Conditional Block = amber, Concern = yellow, Neutral = grey, Supports = green, Escalation Pressure = orange)
- Synthesis section: Areas of Agreement, Areas of Disagreement, Overall Recommendation

**Tab 4 — Requirements**
- Requirements Pass 1 output: FR table, NFR table, Skillset Assessment, Readiness Rating
- Requirements Pass 2 output (if run): delta view showing what changed from Pass 1 and why
- Readiness rating badge: Not Ready / Partially Ready / Ready for Refinement / Ready for Estimation / Ready for Build

**Tab 5 — Decisions**
- Full gate decision log for this ticket
- Per decision: gate name, AI recommendation, human decision, decided by, timestamp, rationale
- This tab is the governance record — should feel like an audit log

**Tab 6 — Feedback**
- Feedback captured on this ticket's agent outputs
- Intake question feedback: each question asked, whether it was necessary, source of feedback
- Agent feedback: any feedback recorded on demand signal, council, requirements outputs
- This feeds the learning loop

---

### 4.4 Demand Signal Review UI

**Purpose:** The soft gate screen where the Head of Product reviews full demand signal output and approves the filtered write-back to ClickUp.

**What to show:**

Full evidence output in a structured review interface:

```
Demand Signal Review — [Ticket Title]

Overall Grade: MEDIUM          Signal Strength: EMERGING
Evidence Quality: OBSERVATIONAL

─────────────────────────────────────────────────────
HIGH GRADE EVIDENCE (2 items)
─────────────────────────────────────────────────────

Item 1 — ClickUp
[Ticket title + link]
"Three other retailers have submitted similar requests in the last
quarter, all citing the same root cause around phantom stock detection."
Grade: High — cross-client, specific, attributable

[ ✓ Include in write-back ]  [ ✗ Discard ]  [ Edit summary ]

─────────────────────────────────────────────────────
MEDIUM GRADE EVIDENCE (3 items)
─────────────────────────────────────────────────────
...

─────────────────────────────────────────────────────
LOW GRADE EVIDENCE — DISCARDED (4 items)
─────────────────────────────────────────────────────
[Collapsed by default — expandable]
...

─────────────────────────────────────────────────────
SUGGESTED EXPERT CONSULTATION
─────────────────────────────────────────────────────
[Name] — active in #availability-alerting, cited in 2 store visit notes
[Name] — raised similar problem 6 months ago in #product-ideas

[ Mark as consulted ]  [ Dismiss ]

─────────────────────────────────────────────────────

[ Approve write-back ]  [ Request amendments ]  [ Reject ticket ]
```

**Key interactions:**
- Per-item include/discard toggle — Head of Product can override the agent's grade on individual items
- Edit summary — inline editing of the evidence summary before write-back
- Approve write-back → posts filtered summary to ClickUp and advances to CoE Review
- Expert consultation suggestions can be marked as acted on (feeds domain_experts table)

---

### 4.5 Council Output View

**Purpose:** Browse CoE council output for any ticket. Understand what the council said and what evolved.

**What to show:**

**Pass 1 view:**
- Six persona cards in a grid
- Each card: persona name, position badge, confidence level, one-line summary of primary concern
- Expandable to full response
- Synthesis at the bottom: Agreement, Disagreement, Overall Recommendation

**Pass 2 view:**
- 13 persona cards
- Round 1 vs Round 2 toggle per persona — show what changed
- Position Evolution Summary as a standalone section
- Contrarian's convergence assessment highlighted separately
- Disagreement tensions listed explicitly with resolution status

**Position badge colours:**
- Hard Block: red
- Conditional Block: amber
- Concern: yellow
- Neutral: grey
- Supports: green
- Escalation Pressure: orange

---

### 4.6 Expert Map

**Purpose:** View and manage the domain expert map built by the Demand Signal Agent.

**What to show:**

- Experts grouped by domain (Availability Alerting, Inventory Accuracy, Waste, Store Colleague Behaviour, etc.)
- Per expert: name, domains, evidence of expertise (expandable), how many times suggested, how many times consulted
- Suggested this week: experts currently flagged on active tickets
- Manually add an expert: Head of Product can add someone the agent has not yet identified

**Key interactions:**
- Mark as consulted on a specific ticket → updates domain_experts.consulted_count
- Add domain tag to an expert → enriches the expert map manually
- This screen is the admin layer for the expertise map

---

### 4.7 Learning View

**Purpose:** See how the system is improving over time. Review feedback, approve prompt changes.

**What to show:**

**Intake Question Quality panel:**
- Most frequently unnecessary questions (bar chart or ranked list)
- Source breakdown: orchestrator inferred vs submitter direct vs head of product
- Trend: is question count per ticket going down over time?

**Agent Feedback panel:**
- Feedback by agent and type
- Which agents are generating the most feedback — signals where prompts need work

**Prompt Version History:**
- Per agent: version timeline, what changed, why, which feedback drove it
- Current active version highlighted
- Propose new version button → opens prompt editor with current version as base

**Outcome Tracking panel:**
- Tickets that have reached delivery: outcome recorded
- CoE concern accuracy: which personas' concerns proved correct most often
- Demand signal accuracy: which source types proved most reliable
- Readiness rating accuracy: how often the Requirements Agent's rating was correct

**Key interactions:**
- Approve prompt change → activates new version in agent_prompt_versions (sets active = TRUE)
- Record outcome for a delivered ticket → posts to ticket_outcomes table

---

### 4.8 Onboard View

**Purpose:** Bring in-flight tickets (pre-Quorum) into the governed pipeline.

**What to show:**

- List of ClickUp tickets not yet in Quorum (fetched from ClickUp, not in workflow_runs)
- Per ticket: title, current ClickUp status, age, rough assessment of evidence richness from description length and comment count
- Onboard button per ticket

**Onboard flow:**
- Click Onboard → Orchestrator runs `/onboard` → Onboarding Assessment displayed
- Gap analysis shown: what is present, what is missing, options
- Head of Product selects option → Orchestrator records decision and proceeds
- Ticket moves to Pipeline view

---

### 4.9 Settings

**Purpose:** Configuration and administration.

**Sections:**

**Agent Configuration**
- Per agent: current prompt version, last updated, active/inactive toggle
- View current prompt (read-only here — edit in Learning view)

**List Configuration**
- ClickUp lists in scope with their IDs
- Add/remove lists (for when WasteInsight, StoreInsight expand in scope)

**Tag Management**
- Current tags (human-gate, bau-cr, stalled, duplicate-suspected)
- Confirm tags are live on all lists

**Notification Preferences**
- How the Head of Product wants to be notified of active gates (email, Slack, in-app)

**API Status**
- MCP connection status per source: ClickUp, Confluence, Slack, Jira, HubSpot, GitHub
- Last successful connection timestamp
- Re-test button per connection

---

## 5. Key UI Components Needed

These are reusable components that appear across multiple screens:

| Component | Used in |
|---|---|
| Gate Card | Gates view, Pipeline view |
| Evidence Item (with grade badge + feedback controls) | Demand Signal Review, Ticket Evidence tab |
| Persona Card (position badge + expandable response) | Council view |
| Position Badge (colour-coded) | Council view, Pipeline view |
| Readiness Rating Badge | Requirements tab, Pipeline view |
| Agent Run Status Badge (complete/partial/failed) | Ticket Overview tab |
| Decision Modal (with rationale field) | All gate approvals |
| Prompt Version Timeline | Learning view, Settings |
| Expert Card | Expert Map, Demand Signal Review |
| Evidence Grade Toggle (High/Medium/Low + discard) | Demand Signal Review |

---

## 6. Data Sources for Each Screen

| Screen | Primary data source |
|---|---|
| Pipeline | Supabase `workflow_runs` + ClickUp status |
| Gates | Supabase `gate_decisions` (unresolved) |
| Ticket Detail | Supabase all tables for this ticket + ClickUp comments |
| Demand Signal Review | Supabase `evidence_records` + `agent_runs` |
| Council | Supabase `agent_runs` raw_output for CoE runs |
| Expert Map | Supabase `domain_experts` |
| Learning | Supabase all learning loop tables |
| Onboard | ClickUp API (tickets not in workflow_runs) |
| Settings | Supabase `agent_prompt_versions` + MCP status checks |

---

## 7. What This Is NOT

- Not a roadmap tool — no drag-and-drop prioritisation
- Not a project tracker — no sprint boards, no burndown charts
- Not a ClickUp replacement — ClickUp remains the team work surface
- Not a chat interface — no free-form conversation with agents
- Not a reporting dashboard — SLT visibility is a later phase

---

## 8. Design Direction Notes

**Tone:** Professional, authoritative, trust-inspiring. This is a governance tool. It should feel like the product equivalent of a board pack — structured, evidence-backed, traceable.

**Density:** High information density where decisions are being made (Gates, Council, Evidence Review). Clean and spacious for overview screens (Pipeline).

**Colour use:**
- Gate active: use a distinct, prominent colour — not red (too alarming for routine gates) — consider amber or a strong blue
- Hard Block: red
- Evidence grades: green (High), amber (Medium), grey (Low/discarded)
- BAU/CR: a distinct badge colour to distinguish fast-track tickets at a glance

**Typography:** Clear hierarchy. Ticket titles prominent. Agent names and persona names consistent. Evidence summaries readable at a glance.

**The one interaction to get right:** The demand signal evidence review with per-item thumbs up/down. This is the most frequent human-AI interaction in the system. It needs to feel effortless — one click per item, clear visual confirmation, easy to undo.

---

## 9. Screens to Prioritise for Early Concepts

If designing for a first-pass concept, prioritise these four:

1. **Pipeline View** — the daily starting point
2. **Gates View** — the most action-critical screen
3. **Demand Signal Review** — the most frequent and nuanced human-AI interaction
4. **Ticket Detail — Council tab** — the most distinctive screen in the system

These four screens demonstrate the full range of what Quorum does and what makes it different from any other product tool.
