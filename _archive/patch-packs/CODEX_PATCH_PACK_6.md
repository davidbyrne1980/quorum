# CODEX_PATCH_PACK_6.md
## Quorum — Patch 17: Local Codebase Path Lookup (ValidationApp)
**Version:** 1.0 | **Date:** 05 Jul 2026
**Depends on:** Packs 1–5 (apply those first)

**Decision encoded:** Claude (Orchestrator) accesses product codebases via local filesystem paths, not GitHub fetch. Only one path is confirmed so far — ValidationApp. StoreInsight and other product-to-repo mappings remain `[TBC — Head of Product]` and must not be guessed.

**Confirmed mapping:**
| Product / repo name | Local path |
|---|---|
| ValidationApp (RI Validation Platform) | `C:\Users\DaveByrne\Documents\RI Validation Platform` |
| StoreInsight | `[TBC — Head of Product]` — do not assume a path |
| AvailabilityInsight | `[TBC — Head of Product]` — do not assume a path |
| InventoryInsight | `[TBC — Head of Product]` — do not assume a path |

**Instruction to Codex:** Single backticks, literal. If a find string fails to match, stop and report — do not improvise. Do not invent paths for the TBC rows under any circumstance; leave them explicitly marked as unresolved.

---

## PATCH 17a — QUORUM.md

In the Tool Boundary section (inserted by Patch 16a), find the line:

`- Reads codebases (ValidationApp, StoreInsight) for context during Requirements, Solution Design, and CoE Pass 2 — read-only, for governance reasoning`

Replace with:

`- Reads codebases for context during Requirements, Solution Design, and CoE Pass 2 — read-only, for governance reasoning. Codebase access is via local filesystem path, not GitHub fetch. See the Codebase Path Lookup table below. Never guess or construct a path for a product not listed there — treat it as unresolved and ask the Head of Product.

**Codebase Path Lookup**

| Product / repo name | Local path | Status |
|---|---|---|
| ValidationApp (RI Validation Platform) | `C:\Users\DaveByrne\Documents\RI Validation Platform` | Confirmed |
| StoreInsight | — | Unresolved — do not guess |
| AvailabilityInsight | — | Unresolved — do not guess |
| InventoryInsight | — | Unresolved — do not guess |

This table is the single source of truth for codebase location. When a document elsewhere (COE_AGENT.md, REQUIREMENTS_AGENT.md, PDLC_ORCHESTRATOR_INSTRUCTIONS.md) says "codebase context," it means: resolve the product against this table, and if unresolved, stop and ask rather than proceeding without codebase grounding or fabricating a path.`

---

## PATCH 17b — COE_AGENT.md

Find:

`Relevant codebase context for existing products (AvailabilityInsight, InventoryInsight) via Claude Code`

Replace with:

`Relevant codebase context via local filesystem access, resolved against the Codebase Path Lookup table in QUORUM.md. If the ticket's product has no confirmed path in that table, note explicitly in the context passed to personas that codebase grounding is unavailable for this product — do not proceed as though context was gathered.`

Find (second occurrence, in the Pass 2 context list):

`- Relevant codebase context for existing products (AvailabilityInsight, InventoryInsight) via Claude Code`

Replace with:

`- Relevant codebase context via local filesystem access, resolved against the Codebase Path Lookup table in QUORUM.md (currently confirmed: ValidationApp only)`

---

## PATCH 17c — REQUIREMENTS_AGENT.md

Find:

`Codebase context — StoreInsight only (Phase 1 POC):
  — CLAUDE.md (codebase orientation — always fetched first)
  — Relevant Confluence architecture pages
  — Targeted source files identified from CLAUDE.md as relevant to ticket scope`

Replace with:

`Codebase context — resolved via local filesystem access against the Codebase Path Lookup table in QUORUM.md. Currently confirmed: ValidationApp only (`C:\Users\DaveByrne\Documents\RI Validation Platform`). If the ticket's product has no confirmed local path, state this explicitly in the requirements output rather than fabricating a path or skipping the check silently:
  — CLAUDE.md or equivalent orientation file at the repo root (read first, if present)
  — Relevant Confluence architecture pages
  — Targeted source files relevant to ticket scope, read directly from the local path`

---

## PATCH 17d — PDLC_ORCHESTRATOR_INSTRUCTIONS.md

In §12a (Delivery Extension, added by Patch 13), find:

`1. **Context Discovery step** — gather ClickUp ticket, docs, codebase areas, API routes, data fields, tests, and prior related tickets ONCE into a Context Pack (output_artefacts type 'context_pack'). Downstream steps consume the pack; they do not re-fetch independently.`

Replace with:

`1. **Context Discovery step** — gather ClickUp ticket, docs, codebase areas, API routes, data fields, tests, and prior related tickets ONCE into a Context Pack (output_artefacts type 'context_pack'). Codebase access is via local filesystem path, resolved against the Codebase Path Lookup table in QUORUM.md — never via GitHub fetch, never guessed. If the ticket's product has no confirmed local path, record this gap explicitly in the Context Pack rather than proceeding without codebase grounding. Downstream steps consume the pack; they do not re-fetch independently.`

---

## Post-patch verification checklist

- [ ] QUORUM.md contains the Codebase Path Lookup table with ValidationApp confirmed and the other three rows explicitly unresolved
- [ ] No document references GitHub fetch as the codebase access method
- [ ] No document assigns a path to StoreInsight, AvailabilityInsight, or InventoryInsight
- [ ] COE_AGENT.md, REQUIREMENTS_AGENT.md, and PDLC_ORCHESTRATOR_INSTRUCTIONS.md all reference the same single lookup table rather than restating paths independently
