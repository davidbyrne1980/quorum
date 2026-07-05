# CODEX_PATCH_PACK_3.md
## Quorum — Patch 14: Composable CoE Pass 2 Council
**Version:** 1.0 | **Date:** 05 Jul 2026
**Depends on:** CODEX_PATCH_PACK.md and CODEX_PATCH_PACK_2.md (apply those first)

**Design decisions encoded (confirmed by Head of Product):**
- Pass 1 roster is fixed (6 personas). Only Pass 2 is composable.
- Roster recommendation is bundled into Gate 5 (Requirements review) — no new gate.
- Mandatory-inclusion rules are HARD — the Orchestrator refuses violating edits.
- Minimum council size: 5 including Contrarian.
- Round count: one round if roster ≤ 7, two rounds if 8+.
- Reduced runs set the same `coe-pass-2-complete` tag; the roster is logged in Supabase.
- Reduced-council synthesis must include a "Lenses Not Represented" section.
- This mechanism is separate from the delivery-extension reviewer recommendation (D01).

**Instruction to Codex:** All code spans below use single backticks and are literal. Match find strings verbatim. Where a patch says "Insert" or "Append", add the block without altering surrounding text. Rule 5 from the original instructions stands: if a find string fails, stop and report.

---

## PATCH 14a — AGENT_ROUTING_RULES.md

### 14a-1 — Roster recommendation produced with Requirements output
In §3, section **Status: Define & Design — no `requirements-added`**, find:

`Add `requirements-added`.
Add `human-review-required`.
Post T-12 gate comment (soft gate — requirements review).
Stop. Wait.`

Replace with:

`Before raising the gate, produce the **Pass 2 Council Roster Recommendation** (see §5a) from the Requirements output.

Add `requirements-added`.
Add `human-review-required`.
Post T-12 gate comment (soft gate — requirements review, includes roster recommendation).
Stop. Wait.`

### 14a-2 — Pass 2 invocation uses approved roster
In §3, section **Status: Define & Design — `requirements-added`, `human-review-required` removed, no `coe-pass-2-complete`**, find:

`**If `bau-cr-signal` absent:**
Invoke CoE Pass 2.

**CoE Pass 2 personas:** All 13 — Product Manager, Analyst, Business Analyst, Platform/Architecture, Engineering, Operations, Customer Success, Product Designer, Decision Science, Product Marketing, Commercial, Project Manager, Contrarian.`

Replace with:

`**If `bau-cr-signal` absent:**
Invoke CoE Pass 2 with the roster approved at Gate 5.

**CoE Pass 2 personas:** The approved roster (see §5a). Default when no reduction was recommended or approved: all 13 — Product Manager, Analyst, Business Analyst, Platform/Architecture, Engineering, Operations, Customer Success, Product Designer, Decision Science, Product Marketing, Commercial, Project Manager, Contrarian. A reduced roster must satisfy the hard rules in §5a. Round count: one round if roster ≤ 7 personas, two rounds if 8 or more.`

Also in the same section, find:

`Do not produce any output until all 13 personas have responded.`

Replace with:

`Do not produce any output until all rostered personas have responded (and, where two rounds run, all Round 2 responses are collected).`

### 14a-3 — New section §5a
Insert a new section after §5 (BAU/CR fast-track lane), before §6:

`## 5a. CoE Pass 2 Council Roster — recommendation and hard rules

The Orchestrator recommends a Pass 2 roster from the Requirements Agent output. The Head of Product approves or edits it at Gate 5. This mechanism applies to Pass 2 only — the Pass 1 roster is fixed.

### Recommendation

For each of the 13 personas, the Orchestrator classifies: **Recommended** (lens materially relevant — one-line rationale) or **Not recommended** (lens not materially engaged — one-line rationale). The recommendation is presented inside the T-12 gate comment / chat presentation.

### Hard rules — enforced by the Orchestrator, not overridable by edit

1. **Contrarian always runs and always closes.** No roster excludes the Contrarian.
2. **Platform/Architecture AND Engineering are mandatory** if the ticket or requirements signal any architecture, API contract, schema, data model, or platform-surface change.
3. **Analyst is mandatory** if the overall demand signal grade was Medium or Low, or if evidence conflicts were raised at any stage.
4. **Decision Science is mandatory** if the ticket touches models, thresholds, scoring, ranking, or alert logic.
5. **Minimum roster size is 5 including Contrarian.** If the Orchestrator cannot justify 5 relevant lenses, it must state in the recommendation that the ticket looks like a BAU/CR candidate and suggest reclassification rather than a sub-minimum council.

If a Head of Product edit violates a hard rule, the Orchestrator refuses the specific removal, cites the rule, and re-presents the roster. The remainder of the edit is applied.

### Round count

- Roster ≤ 7: single round. The Contrarian still runs last, must name specific positions challenged, and must include the convergence assessment normally produced in Round 2.
- Roster ≥ 8: full two-round architecture per COE_AGENT.md §8.

### Decision options at Gate 5 (roster component)

- **Approve roster** — proceed as recommended
- **Add [personas]** — Orchestrator adds and confirms
- **Remove [personas]** — applied unless a hard rule is violated
- **Full council** — all 13, two rounds
- **Reject — reclassify BAU/CR** — routes to Gate 6a instead

### Recording

The approved roster, the recommendation, and any refused edits are recorded in Supabase (`agent_runs.council_roster`, `gate_decisions`). The tag `coe-pass-2-complete` is set identically for full and reduced runs — the roster detail lives in Supabase and the council output header, not in tags.`

---

## PATCH 14b — COE_AGENT.md

### 14b-1 — Roster is passed in
In §2 (Invocation), append after the final paragraph:

`For Pass 2, the Orchestrator also passes the **approved council roster** (the persona subset approved by the Head of Product at Gate 5, validated against the hard rules in AGENT_ROUTING_RULES.md §5a) and the **round count** (one round for rosters of 7 or fewer, two rounds for 8 or more). If no roster is passed, run the full 13-persona, two-round default. You never select or modify the roster yourself — if the passed roster violates a hard rule (e.g. missing Contrarian), flag the error to the Orchestrator and do not run.`

### 14b-2 — Pass 2 roster table becomes the default
In §4, find:

`### Pass 2 — Virtual Workshop (all 13 personas, two rounds)`

Replace with:

`### Pass 2 — Virtual Workshop (default: all 13 personas, two rounds; a reduced roster and round count may be passed by the Orchestrator per AGENT_ROUTING_RULES.md §5a)`

### 14b-3 — Single-round mode
In §8, after the line `Pass 2 runs in two rounds. See Section 8 for the full two-round architecture.` equivalent intro (the paragraph beginning `### Purpose` under Section 8), insert before **Round 1 — Initial Positions**:

`### Single-Round Mode (reduced rosters of 7 or fewer)

When the Orchestrator specifies single-round mode, Round 2 is skipped. All other Round 1 obligations stand unchanged: sequential order, full Task Evidence Summary to every persona, fixed output contract per persona, Contrarian last. In single-round mode the Contrarian must additionally produce the convergence assessment and problematic-movement checks normally performed in Round 2, adapted to Round 1 positions (is consensus forming too quickly, are blocking positions being released without resolution). The Position Evolution Summary section of the output template is replaced with a single line: "Single-round reduced council — no Round 2 conducted. Roster: [list]."`

### 14b-4 — Lenses Not Represented (Q7)
In §8, in the **Pass 2 Output Template**, insert immediately after the `## Council Summary` block (after `**Core Rationale:** [Substantive rationale]` and its closing separator):

`## Council Roster

**Personas convened:** [list]
**Round count:** [1 / 2]
**Roster approved by:** Head of Product — Gate 5, [date]

### Lenses Not Represented
[MANDATORY when any persona was excluded. For each excluded persona, one line: which governance lens is therefore unassessed and what risk that leaves unexamined — e.g. "Commercial: revenue and retention implications not assessed by this council." If the full council ran, state "Full council — all lenses represented."]

Do not redistribute an absent persona's governance dominance weighting to other personas. An unrepresented lens is an explicit, named gap — never silently absorbed.`

### 14b-5 — §5 weighting note
In §5 (Governance Dominance Weighting), append after the final paragraph:

`When a reduced roster runs, apply weightings only across convened personas. Never treat another persona as a proxy for an absent dominant persona's domain — the absence is declared in the Lenses Not Represented section instead.`

---

## PATCH 14c — HUMAN_GATE_MODEL.md (Gate 5 extension)

In **Gate 5 — Requirements Review**, find:

`**What the Head of Product receives:**
- Functional requirements
- Non-functional requirements
- High-level scope assessment
- BAU/CR signal
- Open questions and assumptions flagged by the agent`

Replace with:

`**What the Head of Product receives:**
- Functional requirements
- Non-functional requirements
- High-level scope assessment
- BAU/CR signal
- Open questions and assumptions flagged by the agent
- **Pass 2 Council Roster Recommendation** — per-persona Recommended / Not recommended with one-line rationale, hard-rule inclusions marked as locked, proposed round count (see AGENT_ROUTING_RULES.md §5a)`

And in the Gate 5 decision table, find:

`| Approve — proceed to CoE Pass 2 | Write requirements summary to ClickUp (T-13). Remove `human-review-required`. If not BAU/CR: invoke CoE Pass 2. If BAU/CR: proceed to Gate 6a. |`

Replace with:

`| Approve — proceed to CoE Pass 2 | Record approved roster (as recommended, or as edited — edits validated against hard rules; violating removals are refused with the rule cited). Write requirements summary to ClickUp (T-13). Remove `human-review-required`. If not BAU/CR: invoke CoE Pass 2 with the approved roster and round count. If BAU/CR: proceed to Gate 6a. |`

---

## PATCH 14d — CLICKUP_COMMENT_TEMPLATES.md (T-12)

In the T-12 template body, find:

`**Open questions:** [CONTENT: High materiality open items only — brief list]`

Insert after it:

`**Proposed CoE Pass 2 council:** [CONTENT: recommended roster — persona names only; excluded personas listed with one-line rationale; locked (hard-rule) inclusions marked 🔒; proposed round count]`

And in the same template's decision options, find:

`- Approve — proceed to CoE Pass 2 (or BAU/CR fast-track if applicable)`

Replace with:

`- Approve — proceed to CoE Pass 2 with the proposed council (or BAU/CR fast-track if applicable)
- Edit council — state personas to add or remove; hard-rule inclusions cannot be removed`

---

## PATCH 14e — PDLC_ORCHESTRATOR_INSTRUCTIONS.md

### 14e-1 — Routing block
In §6, section **Define & Design — no requirements-added**, find:

`→ Invoke Requirements Agent
→ Add requirements-added + human-review-required (soft gate)
→ Post T-12`

Replace with:

`→ Invoke Requirements Agent
→ Produce Pass 2 Council Roster Recommendation (AGENT_ROUTING_RULES.md §5a)
→ Add requirements-added + human-review-required (soft gate)
→ Post T-12 (includes roster recommendation)`

In §6, section **Define & Design — requirements-added, ... no coe-pass-2-complete**, find:

`→ not bau-cr: invoke CoE Pass 2 (all 13 personas)`

Replace with:

`→ no bau-cr-signal: invoke CoE Pass 2 with the Gate 5-approved roster (default all 13; ≤7 personas = single round, 8+ = two rounds; hard rules per AGENT_ROUTING_RULES.md §5a)`

(If Patch 3e/5b already changed `not bau-cr` wording in this line, match the post-patch text and apply the roster clause to it.)

### 14e-2 — Gate summary table
In §10, in the gate summary table, find:

`| Requirements review | 5 | Soft | Requirements Agent completes |`

Replace with:

`| Requirements review + Pass 2 roster | 5 | Soft | Requirements Agent completes; roster recommendation attached |`

---

## PATCH 14f — SUPABASE_SCHEMA.md (roster logging)

In §3.2 `agent_runs`, insert after the `source_artefacts` column block:

`  -- Council composition (CoE Pass 2 runs only)
  council_roster      JSONB,
  -- {recommended: [...], approved: [...], excluded: [{persona, rationale}],
  --  locked_by_hard_rule: [...], refused_edits: [{persona, rule_cited}],
  --  round_count: 1|2}`

Add a prose note beneath the table: `For CoE Pass 2 runs, council_roster records the full recommendation-to-approval trail. Reduced and full councils are queryable here — the ClickUp tag layer does not distinguish them by design.`

---

## Post-patch verification checklist

- [ ] AGENT_ROUTING_RULES.md contains §5a with all five hard rules and the five decision options
- [ ] COE_AGENT.md: roster passed in, never self-selected; single-round mode defined; Pass 2 output template contains Council Roster + Lenses Not Represented sections; weighting-proxy prohibition present
- [ ] HUMAN_GATE_MODEL.md Gate 5 receives the roster recommendation and its Approve action records/validates the roster
- [ ] T-12 shows the proposed council with 🔒 markers and an Edit council option
- [ ] SUPABASE_SCHEMA.md agent_runs has council_roster JSONB
- [ ] grep check: `Contrarian` appears in every hard-rule/roster context as always-included and always-last
- [ ] No document states or implies the Pass 1 roster is configurable
