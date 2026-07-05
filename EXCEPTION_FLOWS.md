# EXCEPTION_FLOWS.md
## PDLC Orchestrator — Exception Flows
**Version:** 1.0 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. Purpose

This document defines how the Orchestrator handles every abnormal condition that can arise during the PDLC lifecycle. For each exception type, it specifies: what triggers it, what the Orchestrator does, what gets written to ClickUp, and how the ticket exits the exception state.

These flows are not edge cases — they are expected conditions. The Orchestrator must handle them consistently and without improvisation.

---

## 2. Exception Index

All comments in this document are posted using the templates in CLICKUP_COMMENT_TEMPLATES.md with the ?? PDLC Orchestrator header; the inline strings below are audit-log summaries, not literal comment bodies.

All comments in this document are posted using the templates in CLICKUP_COMMENT_TEMPLATES.md with the ðŸ¤– PDLC Orchestrator header; the inline strings below are audit-log summaries, not literal comment bodies.

| # | Exception | Trigger |
|---|---|---|
| 2.1 | Stall — no reply in Validation with awaiting-info | Working-day timer expires |
| 2.2 | Partial answer received | Submitter replies but incompletely |
| 2.3 | Suspected duplicate | Intake Agent flags possible duplicate |
| 2.4 | Conflicting evidence | Demand signal or CoE surfaces contradiction |
| 2.5 | Noisy or low-grade demand signal | Agent grades evidence as Low |
| 2.6 | Agent failure or low confidence | Agent output is partial, failed, or flagged |
| 2.7 | Human gate — no response | Head of Product has not responded within expected window |
| 2.8 | Ticket scope changes mid-workflow | Submitter or Head of Product changes the ticket |
| 2.9 | Loop detection | Orchestrator risks re-processing a comment or action |
| 2.10 | Out-of-scope ticket | Ticket arrives in a list not in Phase 1 scope |

---

## 2.1 Stall — No Reply in Validation with awaiting-info

**Trigger:** Ticket has been in status `2. Validation` with `awaiting-info` tag active and no submitter reply has been received. Working days only — weekends are excluded from all timer calculations.

**Timer start:** The day the Intake Agent posts clarification questions to ClickUp.

### Day-by-Day Protocol

**Day 3 (no reply):**
- Post automated chase comment to the ClickUp ticket.
- Comment tone: neutral, helpful. Do not imply frustration.
- Comment content: restate the outstanding questions clearly. Reference the original questions by summary (do not repost in full if they are already visible above).
- Post comment: `Chase comment posted — Day 3 [date]`
- No stage change. No escalation yet.

**Day 6 (no reply):**
- Post second chase comment.
- Flag to Head of Product directly (Slack or ClickUp mention, depending on available tooling in Phase 1).
- Comment content: note this is the second chase, state questions are still outstanding, flag that the ticket will be recommended for parking at Day 9 if no reply is received.
- Post comment: `Second chase posted — Head of Product flagged — Day 6 [date]`
- No stage change.

**Day 9 (no reply):**
- Post park recommendation comment.
- Add tag `human-review-required`.
- Comment content: state that no reply has been received after 9 working days, the ticket is recommended for parking, and the Head of Product must decide: park to Closed / grant extension / take over submitter communication.
- Post comment: `Park recommendation posted — awaiting human decision — Day 9 [date]`
- **Stop. Take no further action until the Head of Product responds.**

### Possible Outcomes After Day 9 Gate

| Head of Product Decision | Orchestrator Action |
|---|---|
| Park ticket | Move status to `7. Closed`. Post T-16 closure comment (reason: no submitter response, 9 working days). Remove `awaiting-info`, `stalled`, `human-review-required`. |
| Grant extension | Reset timer. Post comment confirming extension. Remove tag `human-review-required`. Continue monitoring. |
| Take over submitter communication | Post a comment recording this. Continue monitoring. Timer continues from Day 9 unless reset. |

### Reply Received at Any Point
If the submitter replies at any point during the stall period:
- Cancel the stall timer.
- Assess the reply (see 2.2 Partial Answer if incomplete).
- If complete: proceed to Validation. Update ClickUp status. Post confirmation comment.
- Post comment: `Submitter reply received — stall resolved — [date]`

---

## 2.2 Partial Answer Received

**Trigger:** Submitter replies to clarification questions but the reply does not fully address all outstanding questions.

**Do not:**
- Re-ask questions the submitter has already answered.
- Re-post the original full question set.
- Treat the reply as complete and progress the ticket.

**Protocol:**

1. Compare the original clarification questions against what was answered.
2. Categorise each original question as one of:
   - **Answered** — submitter has provided a usable response
   - **Still missing** — no response, or response is too vague to use
   - **New ambiguity introduced** — the submitter's reply raises a new question not in the original set
3. Decide whether the ticket can progress:
   - **Can progress with stated assumptions:** If the missing information is non-critical and a reasonable assumption can be made, document the assumption explicitly, post it to the ticket, and proceed. The assumption must be visible in ClickUp.
   - **Cannot progress:** If missing information is critical to intake, a targeted follow-up is required.
4. If a targeted follow-up is needed:
   - Post a single grouped follow-up comment. Address only the Still Missing and New Ambiguity items.
   - Do not restate answered questions.
   - Restart the working-day timer from the date of the follow-up post.
5. Update Orchestrator comment with outcome.

**Maximum follow-up rounds:** There is no hard cap, but if more than two rounds of partial replies have occurred without progress, flag to Head of Product. Do not continue chasing indefinitely without human awareness.

---

## 2.3 Suspected Duplicate

**Trigger:** Intake Agent identifies one or more existing ClickUp tickets that may be duplicates or near-duplicates of the new submission.

**Do not:**
- Auto-close the ticket.
- Auto-merge the ticket.
- Assume the tickets are duplicates without human confirmation.

**Protocol:**

1. Post a duplicate flag comment to the ClickUp ticket. Include:
   - Links to each suspected duplicate
   - A brief rationale for each (why it is considered a potential match — 1–2 sentences)
   - A clear statement that this is a suspected duplicate, not a confirmed one
2. Add tag `human-review-required`.
3. Set ClickUp status → remain at `Submitted` (do not advance).
4. Post comment: `Duplicate suspected — gate active — [date]`
5. **Stop. Await Head of Product decision.**

### Possible Outcomes

| Head of Product Decision | Orchestrator Action |
|---|---|
| Confirmed duplicate — close | Move status to `7. Closed`. Post T-16 referencing the canonical ticket. Remove tag `human-review-required`. |
| Confirmed duplicate — merge | Record merge instruction in Orchestrator comment. Orchestrator does not perform the merge — this is a human ClickUp action. Once confirmed complete, move status to `7. Closed` on the new ticket, posting T-16 referencing the canonical ticket. |
| Link but keep separate | Add ClickUp link relationship between tickets (if MCP supports). Remove tag `human-review-required`. Continue intake on the new ticket — move status to `Validation`. |
| Not a duplicate — proceed | Remove tag `human-review-required`. Continue intake — move status to `Validation`. |

---

## 2.4 Conflicting Evidence

**Trigger:** At any stage, the Orchestrator or an agent identifies evidence that directly contradicts other evidence supporting the ticket.

Common triggers:
- Demand Signal Agent surfaces two sources with opposing signals
- CoE persona raises a factual contradiction in the evidence base
- Requirements Agent identifies scope assumptions that conflict with Confluence documentation

**Do not:**
- Resolve the conflict on behalf of the Head of Product.
- Suppress or minimise the contradiction.
- Proceed as if the conflict does not exist.

**Protocol:**

1. Document the conflict clearly:
   - Source A: [what it says, where it comes from]
   - Source B: [what it says, where it comes from]
   - Nature of conflict: [why these two things cannot both be true, or why they pull in different directions]
2. Post to ClickUp — include the conflict summary. Do not post raw agent output.
3. Add tag `human-review-required`.
4. Post comment: `Conflicting evidence surfaced — gate active — [date]`
5. **Hard gate. Stop. Await Head of Product decision.**

### Possible Outcomes

| Head of Product Decision | Orchestrator Action |
|---|---|
| Accept Source A, discard Source B | Record decision. Note any grade change in comment. Remove tag `human-review-required`. Continue. |
| Accept Source B, discard Source A | As above. |
| Request additional investigation | Determine which agent (if any) should re-run with a targeted prompt. Invoke if appropriate. Reset gate after re-run. |
| Accept the ambiguity and proceed | Record decision and stated tolerance for ambiguity. Remove tag `human-review-required`. Continue. |
| Reject ticket | Move status to `Closed`. Post closure comment. |

---

## 2.5 Noisy or Low-Grade Demand Signal

**Trigger:** Demand Signal Agent returns evidence graded as Low, or flags that the signal is predominantly composed of weak or uncorroborated sources (particularly from Slack or HubSpot).

**Protocol:**

1. Grade all evidence items as returned by the agent: High / Medium / Low.
2. Low evidence is never written to ClickUp.
3. Low evidence is noted internally as discarded. It does not contribute to the overall demand signal grade.
4. Calculate the overall grade from High and Medium items only.
5. Present the full graded output (including Low items, labelled as discarded) to the Head of Product for review — this is the soft gate.

**If overall grade is Low (after discarding low items, no High or Medium evidence remains):**
- Flag explicitly: demand signal is Low overall.
- This is a hard gate — the Head of Product must decide whether to proceed despite weak evidence.
- Post gate comment: state that demand evidence is insufficient to support a confident progression, and that a decision is required.
- Add tag `human-review-required`.
- **Stop.**

**If Head of Product approves progression with Low-grade evidence:**
- Record the decision explicitly in Orchestrator comment.
- Note in the ClickUp ticket that progression is proceeding with acknowledged low demand signal.
- Note demand signal grade as Low in comment.
- Remove tag `human-review-required`.
- Continue to Product Review.

**Source-specific handling:**
- **Slack:** Treat as noisy by default. Signals from Slack require corroboration from at least one other source before being graded above Low.
- **HubSpot:** Treat as unreliable by default. Flag any hits, but do not weight them in the overall grade unless corroborated.
- **ClickUp / Confluence:** Generally reliable. Weight appropriately.

---

## 2.6 Agent Failure or Low Confidence

**Trigger:** An agent returns output that is partial, explicitly flagged as low-confidence, or fails to run entirely.

**Do not:**
- Treat a partial output as complete.
- Proceed to the next stage on the basis of failed or low-confidence output.
- Suppress the failure.

**Protocol:**

1. Classify the failure type:
   - **Partial output:** Agent ran but one or more required sections are missing or incomplete.
   - **Low confidence:** Agent completed the run but explicitly flagged uncertainty or insufficient context.
   - **Full failure:** Agent did not return usable output.

2. For each failure type, apply the following:

**Partial output:**
- Identify which sections are missing.
- Determine whether the missing sections are critical to the routing decision.
- If non-critical: document the gap explicitly. Proceed with caveat noted in Orchestrator comment.
- If critical: treat as full failure (see below).

**Low confidence:**
- Review the confidence statement from the agent.
- Determine whether the stated uncertainty is material to the routing decision.
- If not material: document and proceed with caveat.
- If material: post to Head of Product for direction. Hard gate.

**Full failure:**
- Option 1: Rerun the agent with a narrower or more targeted prompt. Only do this if the failure is likely due to prompt scope or context overload — not if the underlying information is genuinely absent.
- Option 2: Ask the Head of Product for direction.
- Option 3: Halt and hold the ticket at its current stage.
- Always surface the failure explicitly. Never proceed silently past a full failure.

3. Update Orchestrator comment with failure type, date, and action taken.
4. If a gate is raised: Add tag `human-review-required`.

---

## 2.7 Human Gate — No Response

**Trigger:** A hard or soft gate has been active for an extended period with no response from the Head of Product.

**Note:** In Phase 1, there is no automated SLA enforcement on human gate response times. This is a Phase 2 feature. In Phase 1, the Orchestrator flags but does not escalate automatically.

**Protocol:**

1. If a hard gate has been active for 3 working days with no response:
   - Post a reminder comment to the ClickUp ticket.
   - Post comment: `Gate reminder posted — awaiting Head of Product — [date]`
2. Do not escalate beyond the ClickUp comment in Phase 1.
3. Do not bypass the gate under any circumstances, regardless of how long it has been active.

---

## 2.8 Ticket Scope Changes Mid-Workflow

**Trigger:** The submitter or Head of Product materially changes the ticket description, title, or requirements after a workflow stage has already completed.

**Protocol:**

1. Assess the materiality of the change:
   - **Minor clarification** (does not change scope, intent, or requirements): Note in a comment. No re-run needed. Continue.
   - **Material change** (affects scope, requirements, or the basis on which an agent ran): The relevant agent(s) may need to re-run.

2. For material changes:
   - Identify which stages were completed on the basis of the now-changed information.
   - Post a comment to the ClickUp ticket noting the change and its impact.
   - Present options to Head of Product: re-run affected stages / proceed with change noted / reject and resubmit.
   - Hard gate — await Head of Product decision.

3. If re-run is approved:
   - Reset the ClickUp status to the earliest affected stage.
   - Re-invoke the relevant agent(s) with updated context.
   - Record re-run reason in Orchestrator comment.

---

## 2.9 Loop Detection

**Trigger:** The Orchestrator risks processing the same comment, action, or trigger more than once — potentially causing duplicate agent runs, duplicate ClickUp comments, or circular stage transitions.

**Protocol (Phase 1 — ClickUp fields only):**

1. Before taking any action on a ticket, read the most recent Orchestrator comment.
2. If the Orchestrator comment matches the action you are about to take (same action, same date): stop. Do not repeat the action.
3. Agent-authored ClickUp comments must be distinguishable from submitter comments. The Orchestrator must not re-trigger on its own prior comments.
4. If you identify a potential loop, post a flag comment and surface to Head of Product before proceeding.

**Phase 2 note:** Loop prevention will be enforced via Supabase (last comment ID tracking) and backend tagging of agent-authored comments. Phase 1 relies on most recent Orchestrator comment discipline.

---

## 2.10 Out-of-Scope Ticket

**Trigger:** A ticket arrives in a ClickUp list that is not in Phase 1 scope (e.g. WasteInsight `900501325170`, StoreInsight, or any unknown list).

Resolved: WasteInsight is confirmed out of Phase 1 orchestration scope (intake-only). This section is authoritative.

**Protocol:**

1. Do not process the ticket.
2. If the ticket appears in WasteInsight or StoreInsight: note it as out of scope for Phase 1. If invoked manually against such a ticket, respond with a clear statement that the list is not in scope and no action will be taken.
3. Do not post to the out-of-scope ticket.
4. Flag to Head of Product if out-of-scope tickets are being submitted for orchestration — this may indicate a Phase 2 readiness signal.

---

## 3. Exception State Recovery

When an exception is resolved, the Orchestrator must:

1. Remove tag `human-review-required` (if a gate was active).
2. Update Orchestrator comment with the resolution and date.
3. Determine the correct next ClickUp status based on where the ticket was before the exception.
4. Resume the standard routing flow from that point.

Do not skip stages as a result of exception resolution. If a ticket was in `Validation` when a conflict arose and the conflict is now resolved, it returns to `Validation` — it does not jump ahead.

---

## 4. Exception Escalation Summary

| Exception | Gate Type | Auto-resolved? |
|---|---|---|
| Stall Day 3 / Day 6 (tag: `stalled`) | None (monitoring) | Yes — chase posted automatically |
| Stall Day 9 | Hard | No — human decision required |
| Partial answer | None (if assumptions valid) | Yes — with documented assumption |
| Partial answer (critical gap) | Hard | No |
| Suspected duplicate | Hard | No |
| Conflicting evidence | Hard | No |
| Low-grade demand signal (overall Low) | Hard | No |
| Agent partial (non-critical) | None | Yes — with caveat noted |
| Agent partial (critical) / full failure | Hard | No |
| Human gate no response (Day 3) | None | Yes — reminder posted |
| Scope change (minor) | None | Yes — noted only |
| Scope change (material) | Hard | No |
| Loop detected | Hard | No |
| Out-of-scope ticket | None | Yes — no action taken |
