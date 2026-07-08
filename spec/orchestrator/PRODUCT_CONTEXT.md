# PRODUCT_CONTEXT.md
## Retail Insight — Product Documentation Reference
**Version:** 1.0 | **Organisation:** Retail Insight | **Phase:** 1

---

## 1. Purpose

This file is the single source of truth for where product documentation lives.
All Quorum agents that need product context — COE, Requirements, Demand Signal,
QUIP — resolve documentation locations from here. Never guess paths or URLs.

---

## 2. Jira

All Retail Insight product work tracked in a single Jira project.

| Item | Value |
|---|---|
| Jira project | `AND` |
| Base URL | `https://retailinsightltd.atlassian.net/browse/AND` |
| Covers | AvailabilityInsight, InventoryInsight, StoreInsight, RI Validation App |
| MCP tool | Atlassian MCP — `searchJiraIssuesUsingJql`, `getJiraIssue` |

Use JQL to search: `project = AND AND text ~ "keyword"`. Include the full issue
URL (`https://retailinsightltd.atlassian.net/browse/AND-{issue_number}`) for
every result surfaced.

---

## 3. Confluence

Product documentation lives in the PROD space.

| Item | Value |
|---|---|
| Space key | `PROD` |
| Space URL | `https://retailinsightltd.atlassian.net/wiki/spaces/PROD/overview` |
| Covers | Product specs, requirements, architecture, process docs |
| MCP tool | Atlassian MCP — `searchConfluenceUsingCql`, `getConfluencePage` |

Use CQL to search: `space = PROD AND text ~ "keyword"`. Include the full page
URL for every Confluence result surfaced.

---

## 4. Codebase locations and agent instructions

### 4.1 RI Validation App (ValidationApp)

| Item | Value |
|---|---|
| Local path | `C:\Users\DaveByrne\Documents\RI Validation Platform` |
| Status | **Confirmed** |
| Jira | `https://retailinsightltd.atlassian.net/browse/AND` |

**Agent reading instructions (from Codex — mandatory):**
- Before suggesting product or workflow changes: read `docs/agent-context.md`
- For data model / schema questions: read `docs/schema.md`
- All other product docs: `docs/`

**Key doc paths:**
| Doc | Path | Purpose |
|---|---|---|
| Agent context | `docs/agent-context.md` | Product purpose, users, architecture, tech stack, workflows, known gaps, good clarification questions |
| Schema | `docs/schema.md` | Data model — read before any schema or API changes |
| CSV upload | `docs/csv-upload.md` | Alert import behaviour |
| Collaborative sync | `docs/collaborative-sync.md` | Sync and conflict model |

Do not read codebase files directly for governance work. For COE Pass 2 and
Requirements, the Orchestrator pre-fetches relevant codebase context via the
subagent-fetch pattern (§7.1 AGENT_ROUTING_RULES.md) and passes it as context.
Read the context journal; do not re-fetch independently.

---

### 4.2 StoreInsight

| Item | Value |
|---|---|
| Local path | **Unresolved** — do not guess |
| Jira | `https://retailinsightltd.atlassian.net/browse/AND` (same project) |

If StoreInsight codebase context is needed for a ticket, stop and ask the
Product Manager for the local path. Record confirmed path in QUORUM.md.

---

### 4.3 AvailabilityInsight

| Item | Value |
|---|---|
| Local path | **Unresolved** — do not guess |
| ClickUp list | `901209020398` |
| Jira | `https://retailinsightltd.atlassian.net/browse/AND` (same project) |

If codebase context is needed, ask for the local path. Record in QUORUM.md.

---

### 4.4 InventoryInsight

| Item | Value |
|---|---|
| Local path | **Unresolved** — do not guess |
| ClickUp list | `901204771890` |
| Jira | `https://retailinsightltd.atlassian.net/browse/AND` (same project) |

If codebase context is needed, ask for the local path. Record in QUORUM.md.

---

## 5. When agents should use this file

| Agent | When to read | What to use |
|---|---|---|
| Demand Signal Agent | Searching for demand evidence | §2 (Jira URL + project key), §3 (Confluence space key) |
| Requirements Agent | Any ticket | §3 (Confluence), §4.x product docs path, agent-context.md for ValidationApp tickets |
| COE Pass 1 | Pre-CoE context fetch | §3 (Confluence product docs for this ticket's product area) |
| COE Pass 2 | Pre-CoE context fetch | §3 (Confluence), §4.x (codebase docs for the relevant product) |
| QUIP Scoring Agent | N/A | Does not read product docs directly — context supplied by Orchestrator |
| Quorum (Orchestrator) | Context Discovery step | All sections — assemble context pack before invoking agents |

---

## 6. Context Discovery — Orchestrator checklist

When performing Context Discovery before invoking COE or Requirements:

1. Identify the product from the ClickUp ticket (AvailabilityInsight /
   InventoryInsight / StoreInsight / ValidationApp)
2. Search Confluence (PROD space) for pages relevant to the ticket's problem
   domain — use `searchConfluenceUsingCql`
3. Search Jira (AND project) for related issues — use `searchJiraIssuesUsingJql`
4. If the product has a confirmed local path (§4): pre-fetch
   `docs/agent-context.md` and `docs/schema.md` (for ValidationApp) or
   equivalent docs for other products
5. Append a journal entry linking to all fetched material
6. Pass the compiled context to agents — do not ask agents to fetch it themselves
