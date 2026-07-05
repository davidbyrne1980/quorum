# MIGRATION_PLAN.md
## PDLC Orchestrator — Migration Plan
**Version:** 1.0 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. Purpose

This document covers the migration from the current Copilot Studio and Claude project setup to the PDLC Orchestrator system. It defines what is being migrated, what is being retired, the migration approach for each component, and how to manage the transition without breaking live workflows.

---

## 2. Current State

| Component | Current home | Status |
|---|---|---|
| Signal (pre-submission triage) | Claude project | Operational — no migration needed. Stays as-is. |
| Intake Agent — submission workflow | Copilot Studio | Fully defined — migrate to Claude |
| CoE Agent (both passes, all 13 personas) | Copilot Studio | Fully defined — migrate to Claude |
| Demand Signal Agent | Claude project | Exists — migrate to Orchestrator-managed sub-agent |
| Requirements Agent | Claude project | Exists — migrate to Orchestrator-managed sub-agent |
| Solution Shaping Agent | Not built | New build — Phase 4 |
| PDLC Orchestrator | Not built | New build — Phase 1 |
| PM End-to-End Idea Workflow | Copilot Studio | Retire — do not migrate |
| PO Agent (both versions) | Copilot Studio | Retire — do not migrate |
| ClickUp Reporting Agent | Copilot Studio | Retire — do not migrate |

---

## 3. Migration Decision

**Full migration to Claude.** No hybrid Copilot/Claude orchestration layer.

Copilot agents are retired once their Claude equivalents are stable and have been tested against real tickets. There is no period of parallel running between Copilot and Claude for the same agent — once the Claude version is validated, the Copilot version is switched off.

**Rationale:** A hybrid layer creates routing ambiguity, duplicates maintenance overhead, and makes the Orchestrator's decision logic harder to reason about. A clean cutover per agent is simpler and safer.

---

## 4. Migration Approach by Component

---

### 4.1 Signal (Claude project — no migration)

**Source:** Existing Claude project — Signal v1.2
**Target:** No change. Signal stays exactly as it is.
**Migration type:** None required.

Signal is a pre-submission triage tool used optionally by the product team before formally submitting an idea. It is not part of the PDLC Orchestrator workflow. The Orchestrator does not invoke Signal. Signal does not create ClickUp tasks.

No action required. Signal continues to operate independently throughout Phase 1 and beyond.

See `SIGNAL_AGENT.md` for full documentation of what Signal is and how it relates to the workflow.

---

### 4.2 Intake Agent — Submission Workflow (Copilot → Claude)

**Source:** Copilot Studio — AI-First Idea Intake Workflow (fully defined)
**Target:** Claude sub-agent per `INTAKE_AGENT.md`
**Migration type:** Rebuild from source definition

The Intake Agent is the formal submission mechanism that feeds the PDLC Orchestrator. It handles conversational idea capture, multi-pass field extraction, duplicate detection, ClickUp task creation, and joke-on-creation. It is separate from Signal.

**Steps:**
1. Copilot Studio submission workflow definition already obtained ✅
2. Rebuild in Claude sub-agent format per `INTAKE_AGENT.md`
3. Preserve all existing Copilot behaviour:
   - Conversational submission mode (submitter-facing)
   - Multi-pass field extraction (3–5 passes, confidence threshold)
   - All structured fields: USP, TAM, Strategic Objective, Idea Origin, Pilot, Timing
   - Known client list matching
   - Product auto-detection from keywords
   - Grouped clarification (single prompt, max 5 questions)
   - Review screen before task creation
   - Duplicate detection within same list only
   - ClickUp task creation in correct list with full description format
   - Joke on task creation
4. Add Orchestrator-triggered mode (assess existing Submitted ticket — not just conversational)
5. Migrate ClickUp MCP integration (Copilot connector → Claude ClickUp MCP)
6. Remove any BAU/CR classification logic — classification moves to Orchestrator
7. Test in conversational mode against 3 real idea submissions
8. Test in Orchestrator-triggered mode against 2–3 existing Submitted tickets
9. Head of Product confirms output quality matches or exceeds Copilot version
10. Switch live traffic to Claude version
11. Retire Copilot submission workflow

**Risk:** Low. The submission workflow is well-defined. The main change is adding the Orchestrator-triggered mode alongside the existing conversational mode.

---

### 4.2 CoE Agent — All Personas (Copilot → Claude)

**Source:** Copilot Studio — fully defined (13 personas)
**Target:** Claude sub-agents per `COE_AGENT.md`
**Migration type:** Rebuild from source definitions

**Steps:**
1. Head of Product provides all 13 persona definitions from Copilot Studio
2. Head of Product provides the Decision Science persona full system prompt (captured in planning session chat — needs extracting as a document)
3. Head of Product confirms the Pass 2 output template (existing Copilot format — must be preserved exactly)
4. Build 6 Pass 1 personas first (smaller set — faster to validate)
5. Test Pass 1 against 1–2 tickets that have completed Demand Signal
6. Head of Product confirms Pass 1 output quality
7. Build remaining 7 Pass 2-only personas
8. Test full Pass 2 against 1 ticket that has completed Requirements
9. Head of Product confirms Pass 2 output format matches Copilot version
10. Switch live traffic to Claude version
11. Retire Copilot CoE Agent

**Risk:** Medium. The CoE Agent is the most complex component. 13 personas, two passes, governance weighting, and the requirement to preserve the existing Pass 2 output format all require careful validation.

**Critical dependency:** All persona definitions must be obtained from Copilot Studio before build begins. Do not write persona system prompts from scratch without reviewing the originals.

---

### 4.3 Demand Signal Agent (Claude project → Orchestrator sub-agent)

**Source:** Existing Claude project
**Target:** Orchestrator-managed sub-agent per `DEMAND_SIGNAL_AGENT.md`
**Migration type:** Restructure and integrate

**Steps:**
1. Extract the current Demand Signal Agent system prompt and configuration from the existing Claude project
2. Identify any differences between the current behaviour and the target spec in `DEMAND_SIGNAL_AGENT.md`
3. Key changes to implement:
   - Output is now returned to Orchestrator — not written directly to ClickUp
   - Head of Product review gate added before write-back
   - Per-item grading (High / Medium / Low) formalised
   - Source-specific reliability rules formalised (Slack noisy, HubSpot unreliable)
   - Filtered write-back format (T-07 template)
   - Low-grade hard gate (T-08 template + Gate 3)
4. Test against 2–3 tickets with known demand context
5. Head of Product confirms output quality
6. Retire the standalone Claude project version once Orchestrator-managed version is stable

**Risk:** Low-medium. The core research behaviour is already proven. The changes are structural (gate insertion, write-back control) rather than capability changes.

---

### 4.4 Requirements Agent (Claude project → Orchestrator sub-agent)

**Source:** Existing Claude project
**Target:** Orchestrator-managed sub-agent per `REQUIREMENTS_AGENT.md`
**Migration type:** Restructure and integrate

**Steps:**
1. Extract the current Requirements Agent system prompt and configuration from the existing Claude project
2. Identify differences between current behaviour and target spec in `REQUIREMENTS_AGENT.md`
3. Key changes to implement:
   - CoE Pass 1 challenge integration (concerns must be reflected in requirements)
   - BAU/CR signal added (not classification)
   - Output returned to Orchestrator — not written directly to ClickUp
   - Soft gate added before CoE Pass 2 fires
   - Structured output format (FR / NFR / scope / open questions)
4. Test against 1–2 tickets that have completed CoE Pass 1
5. Head of Product confirms output quality and format
6. Retire the standalone Claude project version

**Risk:** Low. Requirements Agent behaviour is well understood. Changes are structural additions, not redesigns.

---

### 4.5 Agents to Retire (no migration)

The following agents are retired without migration. They are not rebuilt in Claude.

| Agent | Reason for retirement |
|---|---|
| PM End-to-End Idea Workflow | Superseded by PDLC Orchestrator + specialist sub-agents |
| PO Agent (both versions) | Superseded by Requirements Agent + CoE Agent |
| ClickUp Reporting Agent | Superseded by Phase 3 React dashboard (SLT view) |

**Retirement timing:** These agents can be retired as soon as the Claude equivalents are stable. Do not wait until Phase 4. They should not be running in parallel with the Claude system once the Claude system is tested.

---

## 5. Live Ticket Management During Migration

Tickets that are already in flight in ClickUp (in any status from Triage through Define & Design) when Phase 1 build begins must be handled carefully.

### Options

**Option A — Clean cutover at Phase 1 go-live**
All in-flight tickets are assessed manually by the Head of Product at Phase 1 go-live. Their current stage is recorded in the new ClickUp tags. The Orchestrator takes over from that point.

Recommended for Phase 1. Simple to execute. No risk of mixed Copilot/Claude processing on the same ticket.

**Option B — Ticket-by-ticket cutover**
Each ticket is migrated individually as it reaches a natural handoff point (e.g. when it moves to a new status). Copilot handles tickets already in progress; Claude handles new submissions.

Not recommended. Creates a period where some tickets are in Copilot and some are in Claude — increases confusion and makes the Orchestrator's loop prevention harder to enforce.

### Recommended Approach

1. Pick a cutover date with Head of Product
2. On cutover date: assess all in-flight tickets manually — record their current stage in new ClickUp tags
3. All new tickets from cutover date: handled by Claude Orchestrator
4. All in-flight tickets from cutover date: handed to Claude Orchestrator using the stage recorded in tag or comments
5. Copilot agents switched off on cutover date (or as soon as all in-flight tickets have been handed over)

---

## 6. Pre-Migration Checklist

These items must be complete before any agent is migrated or built:

- [x] Copilot Studio submission workflow definition obtained ✅
- [x] All 13 CoE persona definitions obtained ✅
- [x] Decision Science persona system prompt confirmed ✅
- [x] CoE Pass 2 output template confirmed ✅
- [ ] Existing Claude project Demand Signal Agent definition extracted
- [ ] Existing Claude project Requirements Agent definition extracted
- [ ] ClickUp tags created on both lists
- [ ] Terminal status for closed/parked/rejected tickets confirmed
- [ ] 3–5 real test tickets identified for Phase 1 testing
- [ ] Cutover date agreed with Head of Product

---

## 7. Rollback Plan

If the Claude Orchestrator or any migrated agent produces incorrect or unreliable output during Phase 1 testing:

1. Do not use the Claude version on live tickets until the issue is resolved
2. The Copilot versions remain available until explicitly retired — do not retire them until the Claude versions are confirmed stable
3. Issues found during Phase 1 testing are fixed before any Phase 1 go-live declaration
4. The Head of Product makes the final call on whether the Claude system is ready to take over from Copilot

There is no automated rollback. Rollback means continuing to use the Copilot agents while issues are resolved.

---

## 8. Success Criteria

The migration is considered complete when:

- [ ] Signal confirmed operational and unchanged — no action required ✅
- [ ] Intake Agent (submission workflow) migrated and tested in both conversational and Orchestrator-triggered modes
- [ ] All other migrated agents (Demand Signal, CoE, Requirements) tested against 3–5 real tickets
- [ ] Head of Product is satisfied that output quality meets or exceeds the Copilot versions
- [ ] All Copilot agents have been switched off
- [ ] No tickets are being processed by both systems simultaneously
- [ ] ClickUp tags are being maintained correctly by the Orchestrator
- [ ] All hard gates are functioning — no gate has been bypassed during testing
- [ ] Phase 1 end-to-end test (Build Sequence Step 8) has passed
