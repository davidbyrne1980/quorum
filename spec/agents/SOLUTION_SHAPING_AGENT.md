# SOLUTION_SHAPING_AGENT.md
## Solution Shaping Agent — Sub-Agent Definition
**Version:** 0.1 (structural placeholder)
**Organisation:** Retail Insight | **Phase:** 4 (new build)

---

## 1. Status

This agent is a **Phase 4 new build**. It does not exist in any prior system (Copilot Studio or existing Claude projects) and has no migration source.

This document captures the decisions made in the planning session and provides a structural foundation for the full build. It is intentionally incomplete — the full system prompt, output templates, and codebase integration patterns will be defined when Phase 4 build begins.

**Do not invoke this agent in Phase 1, 2, or 3.**

---

## 2. Role and Identity

The Solution Shaping Agent will be responsible for translating a fully validated, requirements-complete ticket into a structured delivery-ready brief. It works from the CoE Pass 2 output as its primary input and produces the artefacts needed to mobilise delivery.

It operates at the intersection of product and engineering — it does not write code, but it produces the structured thinking that makes delivery possible: skillset maps, mobilisation plans, dependency identification, and discipline-specific questions that need answers before build begins.

---

## 3. Invocation (Phase 4)

Will be invoked by the Orchestrator when:
- PDLC Stage is `Solution Shaping`
- CoE Pass 2 has been reviewed and approved by the Product Manager
- BAU/CR Flag is confirmed as No
- Phase 4 is active

BAU/CR tickets bypass this agent entirely — they exit at Delivery Ready after Requirements.

---

## 4. Two Operating Moments

The planning session confirmed two distinct operating moments for this agent:

### Moment 1 — High-Level Scope Check (lightweight, pre-requirements)
A fast, lightweight pass that runs before full requirements are written. Purpose: catch scope issues early before investment in full requirements and CoE Pass 2. This moment may be invoked at the Orchestrator's discretion for complex or ambiguous tickets.

*Full specification to be defined at Phase 4 build.*

### Moment 2 — Full Solution Shaping (post-requirements, post-CoE Pass 2)
The primary operating mode. Full structured shaping of a validated, requirements-complete ticket.

*Full specification to be defined at Phase 4 build.*

---

## 5. Confirmed Outputs (Phase 4 to specify in detail)

The following outputs were confirmed in the planning session:

- **Skillset map** — what disciplines and roles are needed to deliver this ticket
- **Mobilisation plan** — how and in what order work should begin
- **Discipline questions** — specific questions that each involved discipline (Engineering, Design, Data, etc.) must answer before build begins

---

## 6. Context Requirements (Phase 4 to specify in detail)

The agent will require:
- Full ticket content
- Requirements output (approved)
- CoE Pass 2 full review document (the primary input)
- Relevant Confluence documentation
- Codebase context for existing products (AvailabilityInsight, InventoryInsight) via Claude Code
- For new product ideas: documentation only

---

## 7. What This Agent Does Not Do

Even at Phase 4, this agent will not:
- Write code
- Make final architectural decisions (that is Platform/Architecture's remit)
- Produce a project plan or sprint schedule
- Access ClickUp, Confluence, or codebase directly — context is pre-fetched by the Orchestrator
- Write its output directly to ClickUp

---

## 8. Build Trigger

This agent's full specification should be written when:
- Phase 3 (React dashboard) is operational
- At least 3–5 tickets have completed the full Phase 1 workflow (Intake → Requirements → CoE Pass 2)
- The Product Manager has reviewed CoE Pass 2 outputs and can articulate what additional shaping information is needed before delivery

At that point, replace this placeholder with a full agent definition following the same structure as `spec/agents/INTAKE_AGENT.md`, `spec/agents/COE_AGENT.md`, `spec/agents/DEMAND_SIGNAL_AGENT.md`, and `spec/agents/REQUIREMENTS_AGENT.md`.

---

## 9. Open Items

- [ ] Full system prompt — to be written at Phase 4 build
- [ ] Output templates for both operating moments — to be defined at Phase 4 build
- [ ] Codebase integration pattern — to be aligned with CoE Pass 2 codebase access approach
- [x] Relationship to QUIP Scoring Agent (formerly "Roadmap Scoring Agent") — now specified in `spec/agents/QUIP_SCORING_AGENT.md`. The QUIP agent is a non-blocking scoring pass that runs independently of the gate chain; it does not gate or sequence Solution Shaping. Sequencing to be revisited at Phase 4 build if Solution Shaping needs the score as an input.
- [ ] Whether Moment 1 (high-level scope check) is a separate invocation or a mode flag — to be decided at Phase 4
