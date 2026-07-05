# BUILD_SEQUENCE.md
## PDLC Orchestrator — Build Sequence
**Version:** 2.0 | **Organisation:** Retail Insight | **Phase:** 1–3

---

## 1. Overview

The build is structured in three phases. Each phase is functional on its own before the next begins.

| Phase | What gets built | Where | Infrastructure |
|---|---|---|---|
| 1 | Claude Project — manual triage and agent testing | Claude.ai Projects | None |
| 2 | Claude Code Routine — automated daily scheduler | Claude Code Routines + Supabase | Supabase only |
| 3 | React dashboard — SLT visibility and human gate UI | Claude Code + Vercel | Vercel (free tier) |

No Node.js backend. No Railway. No custom scheduler. The Claude Code Routine replaces all of that.

---

## 2. Phase 1 — Claude Project (manual)

**Goal:** Prove the routing logic works against real tickets before automating anything.

**Duration:** 1–2 weeks

**What you build:**

A Claude Project at claude.ai with:
- Project Instructions: `PDLC_ORCHESTRATOR_INSTRUCTIONS.md` (the full orchestrator system prompt)
- Project Knowledge: all agent definitions, routing rules, gate model, comment templates, state model, all 13 persona files
- Connected tools: ClickUp MCP, Confluence MCP

**How you use it:**

Paste a ClickUp ticket URL into the chat. The Orchestrator reads the ticket, reads its tags and comments, applies the routing rules, and tells you what it wants to do. You review and approve. It writes back to ClickUp via MCP.

No automation. No schedule. You control every action manually.

**Steps:**

1. [ ] Confirm all 7 ClickUp statuses exist on both lists
2. [ ] Create all 9 tags on both lists (see `CLICKUP_STATE_MODEL.md` Section 9)
3. [ ] Create Claude Project — add PDLC_ORCHESTRATOR_INSTRUCTIONS.md as Project Instructions
4. [ ] Upload all knowledge files to Project Knowledge
5. [ ] Connect ClickUp MCP and Confluence MCP to the project
6. [ ] Run Phase 1 test sequence (see Section 5)
7. [ ] Validate routing, tags, and comment templates against 3–5 real tickets
8. [ ] Head of Product confirms output quality and routing decisions
9. [ ] Declare Phase 1 complete

**What Phase 1 proves:**
- Routing rules are correct
- Tag logic works
- Comment templates are right
- Gate decisions produce the right Orchestrator response
- CoE Pass 1 and Pass 2 personas produce useful output
- Demand Signal grading workflow is usable

---

## 3. Phase 2 — Claude Code Routine (automated scheduler)

**Goal:** Daily automated triage. Orchestrator runs every working day without you initiating it.

**Duration:** 1–2 weeks after Phase 1 is stable

**What you build:**

**Step 1 — Supabase schema**

The full Phase 2 schema is defined in SUPABASE_SCHEMA.md v4.0 (workflow_runs, agent_runs, gate_decisions, evidence_records, exception_log, comment_log, duplicate_candidates, audit_log, plus learning-loop tables). Build that schema — the earlier three-table sketch is superseded. Do not maintain two schema definitions.

Connect Supabase MCP to Claude Code.

**Step 2 — Claude Code Routine**

Create a Routine at `claude.ai/code/routines`:

- **Name:** PDLC Daily Triage
- **Prompt:** The full Orchestrator triage instructions — loop through all open tickets in AvailabilityInsight (`901209020398`) and InventoryInsight (`901204771890`), read each ticket's status and tags, apply routing rules from `CLICKUP_STATE_MODEL.md`, advance what can be advanced, post comments where needed, update Supabase state
- **Connectors:** ClickUp MCP, Confluence MCP, Supabase MCP
- **Schedule:** `0 8 * * 1-5` (8am UTC weekdays — adjust for your timezone)
- **Test:** Use "Run Now" before activating the schedule

The Routine also gets an HTTP endpoint automatically. Use this to trigger triage on a specific ticket on demand — POST the ticket URL as context.

**Working-day timer logic:**

The Routine calculates working days by:
1. Reading `working_day_timer_start` from Supabase
2. Counting calendar days between start date and today
3. Subtracting Saturdays and Sundays in that range
4. Result = working days elapsed

**Steps:**

1. [ ] Build Supabase schema in Claude Code
2. [ ] Configure Supabase MCP connection
3. [ ] Create Claude Code Routine with full triage prompt
4. [ ] Connect ClickUp MCP, Confluence MCP, Supabase MCP to Routine
5. [ ] Set schedule: `0 8 * * 1-5`
6. [ ] Run manually using "Run Now" — test against 3 real tickets
7. [ ] Confirm Supabase state is being written correctly
8. [ ] Confirm ClickUp tags and comments are being posted correctly
9. [ ] Confirm loop prevention is working (Orchestrator does not re-act on its own comments)
10. [ ] Activate schedule
11. [ ] Monitor first 5 scheduled runs
12. [ ] Declare Phase 2 complete

**What Phase 2 adds over Phase 1:**
- No manual triggering required
- Working-day timer logic is precise
- Agent outputs stored in Supabase (not lost between sessions)
- Full audit log
- Loop prevention is reliable (comment ID tracking)
- Stall detection runs automatically

---

## 4. Phase 3 — React dashboard

**Goal:** SLT-visible pipeline view and human gate approval UI. Also opens Intake Agent to non-Claude users.

**Duration:** 2–3 weeks after Phase 2 is stable

**What you build:**

A React application deployed on Vercel (free tier sufficient at this scale).

**Views:**

1. **Pipeline view** — all open tickets by status, with tags visible. Filterable by product, status, tag. This is the SLT visibility view.

2. **Human gate inbox** — all tickets with `human-review-required` tag. Shows the gate type, what decision is needed, and the relevant agent output. Head of Product approves/rejects from here. Calls the Routine HTTP endpoint to trigger Orchestrator action after decision.

3. **Demand Signal review** — agent outputs awaiting grading. Shows evidence items with High/Medium/Low grading UI. Approved output is written to ClickUp. Discarded items are logged to Supabase.

4. **Idea submission** — Intake Agent embedded for non-Claude users. Anyone with access to the app can submit an idea. Calls the Anthropic API directly. No Claude subscription needed.

**Steps:**

1. [ ] Scaffold React app in Claude Code
2. [ ] Connect to Supabase for state reading
3. [ ] Connect to ClickUp API for ticket data
4. [ ] Build pipeline view
5. [ ] Build human gate inbox with approval actions
6. [ ] Build Demand Signal review UI
7. [ ] Embed Intake Agent (Anthropic API call)
8. [ ] Deploy to Vercel
9. [ ] Share with SLT
10. [ ] Declare Phase 3 complete

---

## 5. Phase 1 test sequence

Use these 5 ticket scenarios to validate Phase 1. You do not need all 5 to be pre-existing tickets — some can be created fresh for testing.

**Test 1 — Complete submission, no duplicate**
A well-formed ticket at Submitted status. Orchestrator should assess it as complete, move to Validation, run Demand Signal, surface output for grading.

**Test 2 — Incomplete submission requiring clarification**
A vague ticket at Submitted. Orchestrator should post clarification questions, add `awaiting-info` tag, move to Validation.

**Test 3 — Stalled ticket**
A ticket at Validation with `awaiting-info` and no reply for 3+ working days. Orchestrator should post Day 3 chase, add `stalled` tag.

**Test 4 — Ticket ready for CoE Pass 1**
A ticket at Validation with Demand Signal already graded. Orchestrator should run CoE Pass 1, add `coe-pass-1-complete`, add `human-review-required`, move to Product Review.

**Test 5 — BAU/CR candidate**
A ticket that describes a small change (1–3 day delivery, narrow scope). Orchestrator should flag for BAU/CR classification, add `bau-cr` if confirmed, route to Delivery Ready bypassing CoE Pass 2 and Solution Shaping.

**Test 6 — Gate decision grammar:** Resolve a multi-way gate (Gate 4) with each of Go / No-Go / Validate Further via explicit decision. Confirm the Orchestrator never routes from tag absence alone and records the decision value.

**Test 7 — State drift detection:** Manually alter a tag in ClickUp mid-flow. Confirm the Orchestrator detects the mismatch against Supabase and raises an exception rather than routing on drifted state.

**Test 8 — Live scenario:** Run the validation-app "group alerts by sub-category" ticket end-to-end per the Phase 2 handoff success criteria.

**Test 9 — Reduced council roster:** Run a mid-size ticket through Gate 5 with a reduced Pass 2 roster recommendation. Approve a roster of ≤7 personas. Confirm: hard-rule personas cannot be removed (attempt one violating removal and verify it is refused with the rule cited); single-round mode fires; the council output contains the Council Roster and Lenses Not Represented sections naming every excluded lens; council_roster is recorded in Supabase; coe-pass-2-complete is set identically to a full run.

**Success criteria for Phase 1:**
- All 5 test scenarios produce correct routing decisions
- Tags are added and removed correctly
- Comments match templates in `CLICKUP_COMMENT_TEMPLATES.md`
- All hard gates stop the Orchestrator correctly
- CoE Pass 1 personas produce useful, differentiated output
- Demand Signal grading workflow is usable by Head of Product
- Head of Product is satisfied output quality meets or exceeds Copilot

---

## 6. Agent build order

Build and test agents in this order within Phase 1:

1. **Orchestrator routing logic** — test without invoking sub-agents first (dry run)
2. **Intake Agent** — test conversational submission and Orchestrator-triggered assessment
3. **Demand Signal Agent** — test against 2–3 tickets with known context
4. **CoE Pass 1** (6 personas) — test against 1–2 post-Demand Signal tickets
5. **Requirements Agent** — test against 1–2 post-CoE Pass 1 tickets
6. **CoE Pass 2** (all 13 personas) — test against 1 post-Requirements ticket
7. **Solution Shaping Agent** — Phase 4 only

---

## 7. Infrastructure summary

| Component | Phase | Tool | Cost |
|---|---|---|---|
| Orchestrator + agents | 1 | Claude Project (claude.ai) | Included in Claude Max |
| Daily scheduler | 2 | Claude Code Routine | Included in Claude Max |
| State + audit log | 2 | Supabase | Free tier sufficient initially |
| React dashboard | 3 | Vercel | Free tier sufficient |
| API calls (non-Claude users, Phase 3) | 3 | Anthropic API | Pay per token |

No Node.js backend. No Railway. No custom cron infrastructure. The Routine handles all scheduling on Anthropic's infrastructure.
