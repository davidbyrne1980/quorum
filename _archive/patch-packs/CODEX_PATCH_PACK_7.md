# CODEX_PATCH_PACK_7.md
## Quorum — Patch 18: Persistent Ticket-Level Context Journal
**Version:** 1.0 | **Date:** 05 Jul 2026
**Depends on:** Packs 1–6 (apply those first)

**Decisions encoded:**
- Scope: ticket-level (survives re-runs — a ticket has one context journal for its whole life, not one per run).
- Trigger: automatic. The Orchestrator appends an entry every time an agent produces output, a gate decision is recorded, or a material event occurs (stall, exception, closure, reopening). Never manually maintained.
- Format: short chronological journal — a few lines per event, linking to the full artefact rather than duplicating it. Newest entry at the bottom (append-only, like a log).
- Replaces: Task Evidence Summary (COE_AGENT.md), Retail Context Brief (PDLC_ORCHESTRATOR_INSTRUCTIONS.md §14), and the one-time delivery Context Pack (§12a) are all superseded by this single journal. No document compiles a separate "everything so far" artefact anymore — every step reads the journal.
- Location: one file per ClickUp ticket, NOT inside a single run folder (since it must survive across runs). Lives at `quorum-context/{clickup_ticket_id}.md`, separate from `quorum-runs/{run_slug}/`.
- Obsidian: no code change required. `quorum-context/` and `quorum-runs/` are plain markdown and can be opened directly as an Obsidian vault. Not part of this patch's scope — noted in QUORUM.md as an optional viewing method only.

**Instruction to Codex:** Single backticks, literal. If a find string fails to match, stop and report — do not improvise.

---

## PATCH 18a — QUORUM.md

### 18a-1 — New section: Context Journal
Insert a new section immediately after "## Run Folder Convention" and before "## Closure Model":

`## Context Journal

Every ClickUp ticket has exactly one context journal, independent of and persisting across however many delivery runs the ticket has:

`quorum-context/{clickup_ticket_id}.md`

The journal is append-only. Every agent run, gate decision, and material event (stall, exception, closure, reopening) adds one short entry — never a full re-paste of prior content. Each entry links to the full artefact for detail rather than duplicating it.

**Entry format:**

`### [DATE] — [EVENT TYPE]
[1-3 sentence summary]
→ Full detail: [link to output_artefacts entry or run-folder file]`

**Event types:** `ticket_created`, `clarification_drafted`, `clarification_answered`, `demand_signal_run`, `demand_signal_graded`, `coe_pass1_complete`, `gate_decision`, `requirements_drafted`, `requirements_approved`, `coe_pass2_complete`, `solution_design_drafted`, `solution_design_approved`, `implementation_handoff_approved`, `stall`, `exception`, `closed`, `reopened`, `rerun_started`.

**This journal replaces three previously separate "compile everything so far" mechanisms, now retired:**
- The Task Evidence Summary (formerly compiled fresh by the Orchestrator before each CoE pass)
- The Retail Context Brief (formerly compiled fresh from Confluence before CoE Pass 1)
- The one-time delivery Context Pack (formerly produced once per delivery run)

Every step that previously required one of these now reads the ticket's context journal instead. Where a step still needs freshly-fetched material (e.g. current Confluence pages, current codebase state), it fetches that material directly and appends a journal entry linking to it — it does not reconstruct a parallel summary document.

**Obsidian note:** `quorum-context/` and `quorum-runs/` are plain markdown folders and can be opened directly as an Obsidian vault for human browsing (backlinks, graph view) — no code or format change is required for this. This is an optional viewing method, not part of the Orchestrator's write path.`

### 18a-2 — Run Lifecycle: add journal read/write steps
Find:

`1. Register the run.
2. Extract the ticket intake.
3. Perform Context Discovery once.
4. Write the shared Context Pack.
5. Recommend persona/workflow path.`

Replace with:

`1. Register the run.
2. Read the ticket's context journal (`quorum-context/{clickup_ticket_id}.md`). If none exists, create it with a `ticket_created` entry.
3. Extract the ticket intake — append a journal entry.
4. Perform Context Discovery once, informed by the journal's history — append a journal entry linking to any newly-fetched material.
5. Recommend persona/workflow path — append a journal entry.`

(Renumber subsequent steps 6–14 accordingly: former step 6 "Pause for D01" becomes step 6; the removed "Write the shared Context Pack" step is not replaced 1:1 — Context Discovery in the new step 4 absorbs it.)

Also add after the renumbered list: `Every pause-for-approval step and every produce-artefact step appends a journal entry at the point the artefact or decision is recorded — this is not a separate step, it is part of each numbered step above.`

---

## PATCH 18b — COE_AGENT.md

### 18b-1 — §3 replace Task Evidence Summary mechanism
Find:

`You do not fetch ClickUp data directly. The PDLC Orchestrator performs all pre-fetching and passes you a consolidated Task Evidence Summary before you invoke any personas.

**You will receive:**
- Full ticket content (title, description, clarification Q&A if applicable)
- Task Evidence Summary — consolidated from: ClickUp ticket, all comments and threads, prior agent outputs (demand signal, requirements where applicable)
- Filtered demand signal summary (High and Medium evidence only — approved by Head of Product)
- Signal output (if Signal ran) — market intelligence brief, competitor analysis, blocking gaps
- **Retail Context Brief** — compiled by the Orchestrator from the Retail Expertise Knowledge Base in Confluence. Contains: retail operational realities, product domain expertise, historical client patterns, Head of Product's note. Every persona receives this. It encodes Retail Insight's institutional knowledge about this type of problem.
- Pass 1 only: the above is sufficient
- Pass 2 additionally: Requirements Pass 1 output (approved), CoE Pass 1 challenge summary, relevant Confluence product documentation, codebase context — resolved via local filesystem access against the Codebase Path Lookup table in QUORUM.md (currently confirmed: ValidationApp only)

**You must pass the full Task Evidence Summary to every persona before they respond.** Personas reason against this evidence — not just the original ticket description.`

Replace with:

`You do not fetch ClickUp data directly. The PDLC Orchestrator reads the ticket's context journal (`quorum-context/{clickup_ticket_id}.md`) and passes you its full contents plus the specific artefacts it links to, before you invoke any personas. There is no separately-compiled Task Evidence Summary or Retail Context Brief — the journal and its linked artefacts are the evidence base.

**You will receive:**
- Full ticket content (title, description, clarification Q&A if applicable)
- The ticket's context journal in full — every prior event, in chronological order
- The full artefacts the journal links to that are relevant to this pass: filtered demand signal summary if run (High and Medium evidence only), Signal output if run, relevant Confluence pages, prior CoE pass output
- Pass 1 only: the above is sufficient
- Pass 2 additionally: Requirements Pass 1 output (approved), CoE Pass 1 challenge summary, relevant Confluence product documentation, codebase context — resolved via local filesystem access against the Codebase Path Lookup table in QUORUM.md (currently confirmed: ValidationApp only)

**You must pass the full context journal and its linked artefacts to every persona before they respond.** Personas reason against this evidence — not just the original ticket description. If the journal shows no demand signal evidence was gathered, state this explicitly rather than treating the absence as neutral.`

### 18b-2 — Journal entry on completion
In §7 (Pass 1 — Early Challenge), after the Pass 1 Output Template block, add:

`On completion, the Orchestrator appends a `coe_pass1_complete` journal entry linking to this output — you do not write to the journal yourself; you return your output to the Orchestrator, which handles the journal write.`

Apply the equivalent note after the Pass 2 Output Template in §8: `On completion, the Orchestrator appends a `coe_pass2_complete` journal entry linking to this output.`

---

## PATCH 18c — PDLC_ORCHESTRATOR_INSTRUCTIONS.md

### 18c-1 — §14 Retail Context Brief — retire
Replace the entire §14 (Retail Context Brief) section, from its heading to the end of its content block, with:

`## 14. Retail Context — via the Context Journal

There is no separately-compiled Retail Context Brief. Institutional and retail-domain context accumulates in each ticket's context journal (`quorum-context/{clickup_ticket_id}.md`) over the ticket's life, and in the cross-ticket institutional knowledge system (knowledge cards — see the Institutional Knowledge System item in ongoing roadmap notes) where patterns recur across tickets.

Before invoking CoE Pass 1, read the ticket's context journal. If it lacks sufficient retail-domain grounding for this ticket's problem area, fetch the relevant Confluence pages directly, append a journal entry linking to what was fetched, and pass both the journal and the newly-fetched material to CoE Pass 1. Do not reconstruct a separate brief document — the journal entry plus the linked source material is sufficient.`

### 18c-2 — §12a Delivery Extension — retire the one-time Context Pack
Find:

`1. **Context Discovery step** — gather ClickUp ticket, docs, codebase areas, API routes, data fields, tests, and prior related tickets ONCE into a Context Pack (output_artefacts type 'context_pack'). Codebase access is via local filesystem path, resolved against the Codebase Path Lookup table in QUORUM.md — never via GitHub fetch, never guessed. If the ticket's product has no confirmed local path, record this gap explicitly in the Context Pack rather than proceeding without codebase grounding. Downstream steps consume the pack; they do not re-fetch independently.`

Replace with:

`1. **Context Discovery step** — read the ticket's context journal (`quorum-context/{clickup_ticket_id}.md`) first. Gather any ClickUp ticket detail, docs, codebase areas, API routes, data fields, tests, and prior related tickets not already reflected in the journal, and append a journal entry linking to what was newly gathered. Codebase access is via local filesystem path, resolved against the Codebase Path Lookup table in QUORUM.md — never via GitHub fetch, never guessed. If the ticket's product has no confirmed local path, record this gap explicitly in the journal entry rather than proceeding without codebase grounding. Downstream steps read the journal; they do not re-fetch independently.`

### 18c-3 — Journal read/write in pre-action check
In §6, find the decision-grammar note inserted by an earlier patch (the paragraph beginning `**Decision grammar:**`). After it, insert:

`**Context journal check:** Before taking any action on a ticket, read `quorum-context/{clickup_ticket_id}.md` in addition to ClickUp status and tags. If it does not exist, create it with a `ticket_created` entry before proceeding. Every action this document describes — Intake completion, gate resolution, agent invocation, exception handling — appends exactly one journal entry at the point it occurs. This is in addition to, not instead of, ClickUp tags and comments: tags/status/comments remain the team-visible state; the journal is the detailed, chronological record behind them.`

---

## PATCH 18d — SUPABASE_SCHEMA.md

Add a note to §3.9 (`output_artefacts`, added by Patch 12b): append `output_type` enum value `'context_journal_entry'` to its comment list, and add a prose line beneath the table: `Context journal entries (see QUORUM.md — Context Journal) are stored as `output_artefacts` rows of type `context_journal_entry`, one row per entry, in addition to existing as lines in the `quorum-context/{clickup_ticket_id}.md` file. The file is the human-readable form; the Supabase rows make it queryable (e.g. "show me every stall event across all tickets this month").`

---

## Post-patch verification checklist

- [ ] QUORUM.md contains the Context Journal section with entry format, event types, and the three-mechanism retirement note
- [ ] Run Lifecycle steps reference reading/writing the journal, not a one-time Context Pack
- [ ] COE_AGENT.md no longer references "Task Evidence Summary" or "Retail Context Brief" as compiled documents — both replaced by journal + linked artefacts
- [ ] PDLC_ORCHESTRATOR_INSTRUCTIONS.md §14 no longer describes compiling a Retail Context Brief
- [ ] §12a Context Discovery step reads/appends the journal rather than producing a one-time Context Pack
- [ ] SUPABASE_SCHEMA.md output_artefacts supports a context_journal_entry type
- [ ] No document instructs re-pasting full prior content into a new entry — entries are short, with links to detail
