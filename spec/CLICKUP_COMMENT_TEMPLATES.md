# CLICKUP_COMMENT_TEMPLATES.md
## PDLC Orchestrator — ClickUp Comment Templates
**Version:** 2.1 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. Purpose

This document contains every comment template the Orchestrator posts to ClickUp. Templates are used verbatim, with placeholders replaced. The Orchestrator does not improvise comment content — it uses these templates.

**Placeholder convention:**
- `[TICKET_ID]` — ClickUp ticket ID
- `[TICKET_TITLE]` — ticket title
- `[DATE]` — date of posting (DD MMM YYYY)
- `[CONTENT]` — variable content specific to the comment type (defined per template)
- `[OPTIONS]` — decision options presented to Head of Product

All comments are attributed to the Orchestrator via the `🤖 PDLC Orchestrator` header. This header is used for loop prevention — do not omit it.

---

## 2. Intake Comments

---

### T-00 — Clarification Questions Pending Review (Phase 2+ only)

**When posted:** After Intake Agent generates questions — before they are sent to the submitter. Phase 2+ only. In Phase 1, questions are presented in the chat window instead.
**Tags added:** `human-review-required`
**Note:** This comment is internal — tagged at Head of Product. The submitter has not yet been asked anything.

```
🤖 **PDLC Orchestrator** | Questions Drafted — Review Required | [DATE]

Clarification questions have been drafted for this submission. They are ready for your review before being sent to the submitter.

**Ticket:** [TICKET_TITLE]

**Drafted questions:**
[CONTENT: drafted clarification questions from Intake Agent]

@[HEAD_OF_PRODUCT] — please review and reply with one of:
- **Approve** — I'll post these to the submitter as-is
- **Edit** — paste your revised version and I'll post that instead
- **Skip** — ticket is complete enough, proceed without asking

⏸️ *Questions will not be posted to the submitter until you approve.*
```

---

### T-01 — Clarification Questions

**When posted:** After Intake Agent run, when clarification is required.
**Status after posting:** Validation
**Tags added:** `awaiting-info`

```
🤖 **PDLC Orchestrator** | Intake Assessment | [DATE]

Thanks for submitting this. To make sure we assess it properly, we have a few questions before we can move it forward:

[CONTENT: grouped clarification questions from Intake Agent output]

You don't need to answer everything in detail — a brief response on each is enough to get us started. Once we hear back, we'll pick this up straight away.
```

---

### T-02 — No Clarification Needed (Proceeding to Validation)

**When posted:** After Intake Agent run, when ticket is complete.
**Status after posting:** Validation

```
🤖 **PDLC Orchestrator** | Intake Complete | [DATE]

Intake assessment complete. The submission looks good — moving this forward to Validation now.

[CONTENT: 2–3 sentence intake summary from Intake Agent]
```

---

### T-03 — Suspected Duplicate Flag

**When posted:** After Intake Agent flags possible duplicate(s).
**Status after posting:** Submitted (held)
**Tags added:** `duplicate-suspected`, `human-review-required`

```
🤖 **PDLC Orchestrator** | Duplicate Check | [DATE]

Before we move this forward, we've found one or more existing tickets that may cover similar ground:

[CONTENT: list of suspected duplicates — each as: Ticket ID | Title | Link | 1–2 sentence rationale]

This is a suspected match, not a confirmed one. No action has been taken.

**Decision required from Head of Product:**
- Confirmed duplicate — close this ticket (reference canonical ticket)
- Confirmed duplicate — merge into existing ticket
- Link tickets but keep separate — continue intake on this one
- Not a duplicate — proceed

⏸️ *On hold pending decision.*
```

---

## 3. Stall / Chase Comments

---

### T-04 — Day 3 Chase

**When posted:** Day 3 working days of no reply in Validation (awaiting-info active).
**Tags added:** `stalled`

```
🤖 **PDLC Orchestrator** | Awaiting Response | [DATE]

Just a nudge — we're still waiting on a response to the questions posted on [ORIGINAL_QUESTION_DATE].

[CONTENT: brief restatement of outstanding questions — summary only, not full repost if questions are visible above]

No rush, but we can't move this forward until we hear back. Drop a reply here when you get a chance.
```

---

### T-05 — Day 6 Chase + Head of Product Flag

**When posted:** Day 6 working days of no reply in Validation.

```
🤖 **PDLC Orchestrator** | Second Chase | [DATE]

This is the second follow-up on the questions posted on [ORIGINAL_QUESTION_DATE]. We haven't received a response yet.

[CONTENT: brief restatement of outstanding questions]

📣 *@[HEAD_OF_PRODUCT] — flagging for awareness. If no response is received by working day 9, this ticket will be recommended for closure.*
```

---

### T-06 — Day 9 Park Recommendation

**When posted:** Day 9 working days of no reply in Validation.
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | Closure Recommendation | [DATE]

We've been waiting for a response to our clarification questions since [ORIGINAL_QUESTION_DATE] — that's 9 working days with no reply.

We're recommending this ticket be closed until the submitter is available to respond.

**Decision required from Head of Product:**
- Close ticket (can be reopened when submitter is available)
- Grant an extension (reset the timer — we'll check back in)
- Take over submitter communication directly

⏸️ *On hold pending decision.*
```

---

## 4. Demand Signal Comments

---

### T-07 — Demand Signal Summary (after Head of Product review)

**When posted:** After the Head of Product approves the filtered demand signal write-back at Gate 2. Never posted at gate-open — pre-approval, output lives in Supabase/chat only.
**Status after posting:** COE Review (CoE Pass 1 fires next)

```
🤖 **PDLC Orchestrator** | Demand Signal | [DATE]

Demand signal assessment complete.

**Grade:** [High / Medium / Low]
**Signal Strength:** [Isolated / Emerging / Established]

**Evidence:**
[CONTENT: High and Medium evidence items — one bullet per item, plain language, 1 sentence each]

*Low-grade evidence was discarded. Full report available on request.*

Proceeding to CoE Pass 1.
```

---

### T-08 — Low Demand Signal Hard Gate

**When posted:** When overall demand signal grade is Low — before any write-back.
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | Demand Signal — Decision Required | [DATE]

The demand signal assessment has returned a Low overall grade. No High or Medium evidence was found across ClickUp, Confluence, Slack, or HubSpot.

This means we don't have sufficient evidence to confidently support progression. A decision is needed before we move forward.

**Decision required from Head of Product:**
- Proceed despite low demand evidence (this will be noted on the ticket)
- Close this ticket — insufficient evidence to continue
- Commission additional investigation before deciding

⏸️ *On hold pending decision.*
```

---

## 5. CoE Comments

---

### T-09 — CoE Pass 1 Gate (Go / No-Go)

**When posted:** After CoE Pass 1 completes — presenting result for Head of Product decision.
**Status after posting:** COE Review
**Tags added:** `coe-pass-1-complete`, `human-review-required`

```
🤖 **PDLC Orchestrator** | CoE Pass 1 — Decision Required | [DATE]

CoE Pass 1 (Early Challenge) is complete.

**Overall recommendation:** [Go / No-Go / Validate Further]

**Demand signal evidence:** [CONTENT: "Assessed — see summary above" / "Not assessed — Demand Signal Agent was not invoked for this ticket"]

**Summary:**
[CONTENT: challenge summary from CoE Pass 1 synthesis — key agreements, key disagreements, dominant concerns — 4–8 sentences. No raw persona output.]

**Decision required from Head of Product:**
- Approve (Go) — proceed to Define & Design
- Reject (No-Go) — close ticket
- Validate Further — [CONTENT: specify what is needed]

⏸️ *On hold pending decision.*
```

---

### T-10 — CoE Pass 1 Closed (No-Go)

**When posted:** Head of Product has rejected at CoE Pass 1 gate.
**Status after posting:** Status unchanged; `closed` tag added

```
🤖 **PDLC Orchestrator** | Ticket Closed | [DATE]

*Ticket remains at its current status; closure is recorded via the `closed` tag.*

This ticket has been reviewed at CoE Pass 1 and the decision is not to proceed.

**Reason:** [CONTENT: reason provided by Head of Product, or CoE Pass 1 No-Go rationale]

Closing ticket. No further action.
```

---

### T-11 — CoE Pass 2 Summary (after Head of Product review)

**When posted:** After Head of Product approves CoE Pass 2 write-back.
**Tags added:** `coe-pass-2-complete`

```
🤖 **PDLC Orchestrator** | CoE Pass 2 Complete | [DATE]

CoE Virtual Workshop complete. All 13 personas have reviewed.

**Overall recommendation:** [Proceed / Proceed with conditions / Do not proceed]

**Summary:**
[CONTENT: workshop summary from CoE Pass 2 synthesis — 3–5 sentences. Key agreements, significant disagreements preserved, conditions if any. No raw persona output.]

[If conditions exist:]
**Conditions before delivery:**
[CONTENT: list of conditions from CoE Pass 2]

[If Phase < 4:] Proceeding to Delivery Readiness check.
[If Phase 4:] Moving to Solution Shaping.
```

---

## 6. Requirements Comments

---

### T-12 — Requirements Gate (Soft — Review Before CoE Pass 2)

**When posted:** After Requirements Agent completes — presenting for Head of Product soft review.
**Tags added:** `requirements-added`, `human-review-required`

```
🤖 **PDLC Orchestrator** | Requirements Drafted — Review Required | [DATE]

Requirements have been drafted and are ready for your review before we proceed to CoE Pass 2.

**Summary:**
[CONTENT: requirements summary from Requirements Agent — 3–5 sentences, plain language]

**BAU/CR signal:** [Yes / No / Uncertain] — [CONTENT: 1 sentence rationale]

**Open questions:** [CONTENT: High materiality open items only — brief list]

**Proposed CoE Pass 2 council:** [CONTENT: recommended roster — persona names only; excluded personas listed with one-line rationale; locked (hard-rule) inclusions marked 🔒; proposed round count]

**Decision required from Head of Product:**
- Approve — proceed to CoE Pass 2 with the proposed council (or BAU/CR fast-track if applicable)
- Edit council — state personas to add or remove; hard-rule inclusions cannot be removed
- Request amendments — [specify what needs changing]
- Reject ticket

⏸️ *On hold pending decision.*
```

---

### T-13 — Requirements Summary (after Head of Product approval)

**When posted:** After Head of Product approves requirements for ClickUp write-back.

```
🤖 **PDLC Orchestrator** | Requirements Approved | [DATE]

Requirements reviewed and approved.

**Scope summary:**
[CONTENT: in-scope / out-of-scope summary — brief]

**Key requirements:**
[CONTENT: top 3–5 functional requirements — plain language, one line each]

**Open items carried forward:**
[CONTENT: High and Medium materiality open questions — brief list, or "None" if resolved]

[If BAU/CR = Yes:] Moving to Ready for Scheduling (BAU/CR fast-track).
[If BAU/CR = No:] Moving to CoE Pass 2.
```

---

## 7. BAU/CR Comments

---

### T-14 — BAU/CR Classification Gate

**When posted:** Orchestrator has identified BAU/CR signal — confirming with Head of Product.
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | BAU/CR Classification — Confirmation Required | [DATE]

Based on the requirements assessment, this ticket appears to qualify for the BAU/CR fast-track.

**Classification rationale:** [CONTENT: why Orchestrator flagged as BAU/CR — scope, estimated size, no new architecture]

If confirmed, this ticket will skip CoE Pass 2 and Solution Shaping and proceed directly to Ready for Scheduling.

**Decision required from Head of Product:**
- Confirm BAU/CR — proceed to Ready for Scheduling
- Reject classification — treat as strategic, proceed to CoE Pass 2

⏸️ *On hold pending decision.*
```

---

## 8. Delivery and Closure Comments

---

### T-15 — Ready for Scheduling Gate

**When posted:** All upstream stages complete — presenting for final Head of Product approval.
**Status after posting:** Ready for Scheduling
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | Ready for Scheduling — Approval Required | [DATE]

This ticket has completed all PDLC stages and is ready for scheduling.

**Delivery Readiness:** Pass

**Completed stages:**
[CONTENT: checklist of completed stages — e.g. ✅ Intake ✅ Demand Signal ✅ CoE Pass 1 ✅ Requirements ✅ CoE Pass 2]

**Caveats / open items:**
[CONTENT: any assumptions or open items that remain active — or "None"]

**BAU/CR:** [Yes / No]

**Decision required from Head of Product:**
- Approve — move to Scheduled
- Hold — not ready to schedule (state reason)
- Reject — close ticket

⏸️ *On hold pending decision.*
```

---

### T-16 — Ticket Closed (General)

**When posted:** Ticket is being closed for any reason other than CoE Pass 1 No-Go.
**Status after posting:** Status unchanged; `closed` tag added

```
🤖 **PDLC Orchestrator** | Ticket Closed | [DATE]

*Ticket remains at its current status; closure is recorded via the `closed` tag.*

**Reason for closure:** [CONTENT: one of — No submitter response (9 working days) / Rejected at [stage] / Confirmed duplicate of [ticket ID] / Merged into [ticket ID] / Insufficient demand evidence / Head of Product decision]

[CONTENT: 1–2 sentences of additional context if relevant]

No further action. Ticket can be reopened by the Head of Product if circumstances change.
```

---

### T-17 — Conflicting Evidence Gate

**When posted:** Conflicting evidence surfaces at any stage.
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | Conflicting Evidence — Decision Required | [DATE]

We've identified a conflict in the evidence base that needs a decision before we can proceed.

**Source A:** [CONTENT: what it says, where it comes from]
**Source B:** [CONTENT: what it says, where it comes from]
**Nature of conflict:** [CONTENT: why these cannot both be true, or why they pull in different directions]

**Decision required from Head of Product:**
- Accept Source A (discard Source B)
- Accept Source B (discard Source A)
- Request further investigation
- Accept the ambiguity and proceed
- Reject ticket

⏸️ *On hold pending decision.*
```

---

### T-18 — Agent Failure Gate

**When posted:** Agent failure is critical and cannot be self-resolved.
**Tags added:** `human-review-required`

```
🤖 **PDLC Orchestrator** | Agent Issue — Direction Required | [DATE]

The [AGENT_NAME] has returned an issue that needs your input before we can continue.

**Failure type:** [Partial output / Low confidence / Full failure]
**What's missing or uncertain:** [CONTENT: specific description]
**What's been attempted:** [CONTENT: any re-run or narrowing attempted, or "Nothing attempted yet"]

**Decision required from Head of Product:**
- Re-run with a different or narrower prompt
- Proceed without this agent's output (gap will be noted)
- Halt ticket at this stage
- Reject ticket

⏸️ *On hold pending decision.*
```

---

### T-19 — Human Gate Reminder

**When posted:** `human-review-required` has been active for 3 working days with no response.

```
🤖 **PDLC Orchestrator** | Reminder — Decision Still Required | [DATE]

A reminder that this ticket is on hold, waiting for a decision from the Head of Product.

**Gate:** [CONTENT: gate name]
**Active since:** [CONTENT: date gate was activated]
**Decision required:** [CONTENT: brief restatement of what is needed — 1–2 sentences]

No action will be taken until a decision is received.
```

---

## 9. Comment discipline rules

1. **Always include the 🤖 PDLC Orchestrator attribution header.** Loop prevention depends on this.
2. **Never post raw agent output.** Summaries only, after Head of Product review where required.
3. **Never post Low-grade demand evidence.** Discarded items are not written to ClickUp.
4. **Never repeat information already visible in the ticket.** Reference it briefly rather than reposting.
5. **Keep gate comments actionable.** Every gate comment must state clearly what decision is required and what the options are.
6. **One comment per trigger per day.** Check the most recent Orchestrator comment before posting. If the same action was taken today, do not repeat.
7. **Plain language.** Comments are read by submitters who may not be technical.
8. **Status references must match.** Use only these status names: Submitted, Triage, Validation, COE Review, Define & Design, Ready for Scheduling, Scheduled. There is no Closed status — use the `closed` tag and state the closure reason in the comment; do not reference a status change on closure.
