# Quorum Run-Folder Restructure — Implementation Spec (for Codex)

**Owner:** Head of Product (Dave)
**Author:** Claude (Orchestrator)
**Status:** Ready to implement
**Repo:** `PDLC IN CLAUDE` (this repo — Codex has access)
**Platform note:** Windows host. Use `git mv` for all moves to preserve history. Paths in this doc use `/`; adjust for the shell you run in.

---

## 1. Goal

Replace the current **per-run** folder layout with a **per-ticket** ("ticket-centric") layout so folder count scales with *tickets*, not *runs*. Everything belonging to one ClickUp ticket — its context journal, its lifecycle QUIP scores, and each of its delivery runs — lives under a single ticket folder.

This is **Option A** from the design discussion. It was chosen over keeping two trees (B) and over date-first bucketing (C).

Scope of this task: **(1)** migrate existing folders, **(2)** update all spec/doc references, **(3)** update the dashboard generator + server to read the new layout and render one card per ticket. The full *visual* dashboard redesign (see `dashboard/DASHBOARD_REDESIGN_BRIEF.md`) is **out of scope** — here the generator only needs to keep working against the new structure.

---

## 2. Current state (as-is)

Two sibling trees at repo root:

```
quorum-runs/
  {run_slug}/                         # run_slug = "{YYYY-MM-DD}-{kebab-title}"
    00_run_manifest.md
    01_ticket_intake.md
    …
    10_clickup_summary.md
    QUIP_score_v{n}.md                # currently lives inside a run folder
quorum-context/
  {run_slug}.md                       # context journal — NOTE: currently keyed by run_slug,
                                      # despite docs saying "{clickup_ticket_id}.md"
```

Known real contents today (only two tickets exist — migrate both):

| Current folder | Contents | ClickUp Ticket ID |
|---|---|---|
| `quorum-runs/2026-07-05-validation-app-group-alerts-by-subcategory/` | `00_…`–`09_…` (no `10_`) | **TBC / unknown** (manifest says `[TBC - Head of Product]`) |
| `quorum-context/2026-07-05-validation-app-group-alerts-by-subcategory.md` | context journal for the above | — |
| `quorum-runs/2026-07-07-storeinsight-v1-eoe-pilot/` | `QUIP_score_v1.md`, `QUIP_score_v2.md` **only** (no run artefacts) | **869ayynqb** |

Two problems this exposes and the new layout must handle: **(a)** a ticket with unknown ID, and **(b)** a ticket with scores but no runs.

---

## 3. Target state (to-be)

One tree at repo root: **`quorum-tickets/`**. `quorum-runs/` and `quorum-context/` are removed.

```
quorum-tickets/
  {ticket_folder}/                    # one folder per TICKET
    _ticket.md                        # stable ticket index (identity + current state + pointers)
    _journal.md                       # append-only context journal (moved from quorum-context/)
    scores/                           # ticket-level QUIP scores (span runs; created only if scored)
      QUIP_score_v1.md
      QUIP_score_v2.md
    runs/                             # delivery runs (created only if a run exists)
      {YYYY-MM-DD}__run-01/
        00_run_manifest.md
        01_ticket_intake.md
        …
        10_clickup_summary.md
      {YYYY-MM-DD}__run-02/
        …
```

### 3.1 Naming rules

- **`{ticket_folder}` = `{clickupTicketId}__{slug}`**
  - `clickupTicketId`: the ClickUp task id (e.g. `869ayynqb`).
  - If the ticket id is genuinely unknown/TBC, use the literal prefix **`no-id`** → `no-id__{slug}`. When the id is later confirmed, the folder is renamed with `git mv` (record the rename in `_journal.md`).
  - `slug`: kebab-case of the ticket title, lowercase, alphanumerics + hyphens only, collapse repeats, **max 60 chars**, no trailing hyphen.
  - Double underscore `__` separates id from slug (greppable, unambiguous vs the single hyphens in the slug).
- **`{run}` folder = `{YYYY-MM-DD}__run-{NN}`**
  - Date = run start date (from `00_run_manifest.md` "Run ID"/created date; fall back to the date prefix of the old folder).
  - `NN` = zero-padded, incrementing per ticket: `run-01`, `run-02`, …
- **Always nest runs under `runs/`**, even when a ticket has a single run (predictable; the dashboard never special-cases).
- `scores/` and `runs/` are **created lazily** — a ticket that has been scored but not run has `scores/` and no `runs/`, and vice-versa.

### 3.2 `_ticket.md` template

Lightweight index the Orchestrator maintains and the dashboard reads first (falls back to newest run manifest if absent). Keep authoritative *scoring* detail in the score files and *run* detail in manifests — do not duplicate it here.

```markdown
# {Ticket Title}

- **ClickUp ID:** {id | TBC}
- **ClickUp URL:** {url | TBC}
- **Product:** {product}
- **Live ClickUp status:** {status}
- **Current PDLC stage:** {stage}
- **Created:** {YYYY-MM-DD}
- **Runs:** {count} — see `runs/`
- **Latest QUIP score:** {total} ({status}) — `scores/QUIP_score_v{n}.md`  (omit if never scored)
- **Journal:** `_journal.md`
```

### 3.3 Canonical path mapping (old → new)

| Concept | Old | New |
|---|---|---|
| Run artefact | `quorum-runs/{run_slug}/{artefact}` | `quorum-tickets/{ticket_folder}/runs/{run}/{artefact}` |
| Context journal | `quorum-context/{clickup_ticket_id}.md` | `quorum-tickets/{ticket_folder}/_journal.md` |
| QUIP score | `quorum-runs/{run_slug}/QUIP_score_v{n}.md` | `quorum-tickets/{ticket_folder}/scores/QUIP_score_v{n}.md` |
| Ticket index | (none) | `quorum-tickets/{ticket_folder}/_ticket.md` |

---

## 4. Migration steps (exact, for the two existing tickets)

Use `git mv` for every move. After moving, delete the now-empty `quorum-runs/` and `quorum-context/` dirs.

### 4.1 Validation-app ticket (unknown id → `no-id`)

```
Target folder: quorum-tickets/no-id__validation-app-group-alerts-by-subcategory/
```
1. `git mv quorum-runs/2026-07-05-validation-app-group-alerts-by-subcategory` → `quorum-tickets/no-id__validation-app-group-alerts-by-subcategory/runs/2026-07-05__run-01`
2. `git mv quorum-context/2026-07-05-validation-app-group-alerts-by-subcategory.md` → `quorum-tickets/no-id__validation-app-group-alerts-by-subcategory/_journal.md`
3. Create `_ticket.md` from the template using values from `00_run_manifest.md` (ClickUp ID = TBC, status = Validation, etc.).

### 4.2 Store Insight ticket (id `869ayynqb`, scores only)

```
Target folder: quorum-tickets/869ayynqb__store-insight-v1-eoe-pilot/
```
1. `git mv quorum-runs/2026-07-07-storeinsight-v1-eoe-pilot/QUIP_score_v1.md` → `quorum-tickets/869ayynqb__store-insight-v1-eoe-pilot/scores/QUIP_score_v1.md`
2. Same for `QUIP_score_v2.md`.
3. In **both** moved score files, update the header field `**Quorum Run:** 2026-07-05-storeinsight-v1-eoe-pilot` → `**Ticket folder:** 869ayynqb__store-insight-v1-eoe-pilot`. **Change nothing else** in these files — scoring content, CSV rows, and the `<!-- quip:open-questions -->` marker must remain byte-for-byte identical.
4. Create `_ticket.md` (ClickUp ID = 869ayynqb, URL = https://app.clickup.com/t/869ayynqb, Product = StoreInsight, status = "8. Build & Deploy", latest score 72.5 final).
5. This ticket has **no `runs/`** — do not create an empty one.

### 4.3 Cleanup
- Remove empty `quorum-runs/` and `quorum-context/` directories (`git rm` any leftover, or ensure they contain no tracked files).

---

## 5. Documentation edits

Update every reference to the old paths. **Do not touch anything under `_archive/`** (historical). After edits, this must return no hits outside `_archive/` and this spec file:

```
grep -rnE "quorum-runs|quorum-context|run_slug|\{clickup_ticket_id\}\.md" . --include=*.md --include=*.cjs
```

Enumerated edit points (verify line numbers before editing — they may shift):

- **`QUORUM.md`**
  - Run Lifecycle step 2 (~L58): journal path → `quorum-tickets/{ticket_folder}/_journal.md`.
  - "Run Folder Convention" section (~L74–L101): rewrite to the §3 layout. The numbered `00_…10_` artefact list stays, but now lives under `runs/{run}/`. Move the `QUIP_score_v{n}.md` note to describe `scores/` at ticket level.
  - Context Journal section (~L104–L110): path → `_journal.md`; note it is now co-located per ticket.
  - Obsidian note (~L129): reference the single `quorum-tickets/` tree instead of two dirs.
- **`spec/agents/QUIP_SCORING_AGENT.md`**
  - §4 versioning (~L52): scores are found by scanning `scores/` under the ticket folder (no longer "across all run folders").
  - Report Header (~L306): `**Quorum Run:** {run_slug}` → `**Ticket folder:** {ticket_folder}`.
  - §10 output path (~L416): `quorum-tickets/{ticket_folder}/scores/QUIP_score_v{n}.md`.
  - §10 version-collision + journal note (~L421–L423): scores dir + `_journal.md`.
- **`spec/orchestrator/AGENT_ROUTING_RULES.md`** (~L378): QUIP output goes to the ticket's `scores/`, not "current run folder".
- **`spec/orchestrator/PDLC_ORCHESTRATOR_INSTRUCTIONS.md`** (~L139, L396, L402, L441): journal path and run-folder path → new layout.
- **`spec/agents/COE_AGENT.md`** (~L36): journal path.
- **`schema/SUPABASE_SCHEMA.md`** (~L403): file-path reference for the journal → `_journal.md`. **Leave all table columns unchanged** (e.g. `run_slug`, `workflow_run_id`) — those are values/keys, not filesystem paths, and are out of scope.
- **`templates/`**: grep this folder too; update any path references inside artefact templates (e.g. `run_manifest.md`).

---

## 6. Dashboard generator changes (`dashboard/generate_dashboard.cjs`)

The generator currently treats **one run = one card** and matches journals across two dirs. Refactor to **one ticket = one card**, with its runs nested. Keep the current visual styling — only the data model and card composition change.

### 6.1 Directory constants (L21–L25, L823 export)
- Replace `RUNS_DIR` / `CONTEXT_DIR` with a single `const TICKETS_DIR = path.join(ROOT, 'quorum-tickets');`.
- Update `module.exports` (L823) accordingly (see §7 for the server dependency).

### 6.2 Scanning (`buildDashboardHtml`, L768–L807)
- Iterate `listDirs(TICKETS_DIR)` → one **ticket** per entry.
- For each ticket folder build a `ticket` object:
  - `meta`: parse `_ticket.md` (reuse `parseKeyValues`/`firstValue`). If absent, fall back to the newest run's `00_run_manifest.md`.
  - `journal`: `parseJournal(readFileSafe(path.join(ticketDir, '_journal.md')))`. Journals are now **co-located** — delete `matchJournalKeys` (L459) and the whole orphan-journal matching block (L772–L797); there are no orphans by construction.
  - `runs`: `listDirs(path.join(ticketDir, 'runs'))`, each built by the existing `buildRun` logic (rename it to operate on an arbitrary run dir rather than `path.join(RUNS_DIR, slug)` at L404). Runs sorted ascending by folder name.
  - `quip`: run the existing `parseQuip` against `path.join(ticketDir, 'scores')` (currently it scans the run dir — point it at `scores/`).
- `stats`: `tickets` (count), `awaiting` (tickets with any pending gate across their runs), plus keep a QUIP-provisional count if cheap.

### 6.3 Rendering (`renderRun` → `renderTicket`)
- Card header shows the **ticket**: title, ClickUp id + link, live status pill, current stage, run count, latest QUIP pill/flag (reuse the existing pill + amber `provisional` flag — do not regress that).
- Card body shows, per the PM requirements:
  - **What it is** — from `_ticket.md`.
  - **Runs** — a list; each run expandable to its `00_…10_` artefacts with working file links.
  - **Scores** — links to `scores/QUIP_score_v*.md`.
  - **History / journal** — the existing journal timeline (`renderJournal`), now taken from the ticket's `_journal.md`.
  - **State now / next** — current ClickUp status + the next status per the routing rules (a static status-order lookup is fine; do not hard-block on it).
- **File-link paths** (`renderArtefacts`, ~L440–L459): update the relative hrefs to the new nested location `quorum-tickets/{ticket_folder}/runs/{run}/{file}` (and `scores/…`). Links must resolve both for the static file opened from disk and via the live server’s static route (§7).

### 6.4 Console summary (`main`, L809–L819)
- Report "Tickets scanned" instead of "Runs scanned"; keep "Awaiting a gate".

---

## 7. Dashboard server changes (`dashboard/serve_dashboard.cjs`)

- Import: `const { buildDashboardHtml, TICKETS_DIR, ROOT } = require('./generate_dashboard.cjs');` (L25) — `RUNS_DIR`/`CONTEXT_DIR` no longer exist.
- Static-file allowlist (L145–L146): allow paths under `TICKETS_DIR` (replace the two `inRuns`/`inCtx` checks with a single `inTickets`).
- File watching (L172–L173): `watchDir(TICKETS_DIR)` (recursive watch already covers nested `runs/`, `scores/`).
- Everything else (port, debounce, SSE refresh) unchanged.

---

## 8. Acceptance criteria

1. `node dashboard/generate_dashboard.cjs` runs with no errors and prints "Tickets scanned: 2".
2. The generated `dashboard/quorum_dashboard.html` shows **two ticket cards**:
   - `no-id__validation-app-group-alerts-by-subcategory` — 1 run (`2026-07-05__run-01`) with 9 artefacts (00–09) linked and resolvable; its journal timeline renders.
   - `869ayynqb__store-insight-v1-eoe-pilot` — 0 runs, 2 scores; QUIP pill shows **v2: 72.5** and **no** provisional flag (v2 is `final`).
3. `node dashboard/serve_dashboard.cjs` serves at `http://localhost:4319`; artefact/score links open the correct files; editing a file triggers a live refresh.
4. `grep -rnE "quorum-runs|quorum-context" . --include=*.md --include=*.cjs` returns **no hits outside `_archive/` and this spec file**.
5. `git log --follow` on a migrated artefact (e.g. `…/runs/2026-07-05__run-01/00_run_manifest.md`) shows history preserved across the move.
6. The two migrated QUIP score files differ from their originals **only** in the single `**Quorum Run:**` → `**Ticket folder:**` header line (verify with `git diff -M`).

---

## 9. Edge cases the implementation must handle

- **Unknown ticket id** → `no-id__{slug}` prefix; rename later when id is known.
- **Ticket with scores but no runs** → no `runs/` dir; card still renders with scores.
- **Ticket with runs but never scored** → no `scores/` dir; no QUIP pill.
- **Missing `_ticket.md`** → fall back to newest run manifest for header fields; still render.
- **Empty `quorum-tickets/`** → generator prints "Tickets scanned: 0" and produces a valid empty-state page (don’t crash).
- **`_journal.md` absent** → render the card with an empty/"no journal" timeline (match current behaviour for missing journals).

---

## 10. Out of scope (do NOT change)

- The full visual redesign of the dashboard — that is `dashboard/DASHBOARD_REDESIGN_BRIEF.md`, a separate task built on top of this structure.
- Supabase **table columns** (`run_slug`, `workflow_run_id`, etc.) — only the one prose file-path reference in `SUPABASE_SCHEMA.md` §Context-journal changes.
- ClickUp state, tags, or any write-back.
- The QUIP scoring methodology, bands, or CSV column order.
- Anything under `_archive/`.

---

## 11. Suggested commit breakdown

1. `Migrate quorum-runs/quorum-context → quorum-tickets (ticket-centric layout)` — the `git mv`s + `_ticket.md` creation + dir cleanup.
2. `Update Quorum specs/docs for ticket-centric run layout` — all §5 doc edits.
3. `Update dashboard generator + server for ticket-centric layout` — §6–§7.

Keep migration (1) separate so `git log --follow` cleanly shows the moves.
