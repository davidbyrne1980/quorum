# SUPABASE_SCHEMA.md
## Quorum — Supabase Schema
**Version:** 5.0 | **Organisation:** Retail Insight | **Phase:** 1+

---

## 1. Purpose

Supabase serves two distinct roles in Quorum:

**Role 1 — Workflow State and Audit Layer**
The authoritative source of truth for orchestration state. ClickUp is the human-facing work surface. Supabase is what the system uses to function reliably — workflow run state, agent run logs, gate decisions, exception tracking, idempotency keys. Without this, the Orchestrator reads its own comments to understand ticket state, which is fragile and undebuggable.

**Role 2 — Learning Loop Database**
Captures feedback on agent outputs, tracks prompt versions, and records ticket outcomes so the system improves over time.

**Role 3 — Delivery Extension State**
When a ticket exits governance (post-Delivery Ready, or via the BAU/CR lane) and enters delivery preparation (context pack → solution design → test plan → implementation handoff → Codex), the same tables carry it: workflow_runs gains a run per delivery cycle, output_artefacts holds the versioned run-folder documents, gate_decisions holds the delivery approval gates (solution design approval, implementation handoff approval). No parallel schema exists.

ClickUp handles: visible ticket, status, tags, comments, human review and approval.
Supabase handles: everything the system needs to run reliably and learn.

---

## 2. Design Principles

- **ClickUp is the work surface. Supabase is the control plane.** Writes go to both where relevant; routing decisions read from Supabase.
- **Every agent run is logged.** Full prompt version, source artefacts used, output quality, confidence. Debuggable from day one.
- **Every gate decision is recorded.** Named approver, timestamp, rationale. AI recommendation vs human decision are always distinct.
- **Idempotency is enforced.** Duplicate agent runs are caught before they fire, not after.
- **The learning loop is append-only.** Feedback and outcomes are never deleted.
- **One schema.** The quorum_* table set proposed in the Phase 2 handoff is not built. This document is the only schema definition.

---

## 3. Tables

---

### 3.1 `workflow_runs`

One row per ticket under orchestration. The primary state record.

```sql
CREATE TABLE workflow_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_ticket_id         TEXT NOT NULL,
  clickup_list_id           TEXT NOT NULL,
  product                   TEXT NOT NULL,
  -- 'AvailabilityInsight' | 'InventoryInsight' | 'WasteInsight'
  title                     TEXT NOT NULL,

  -- Current state
  clickup_status            TEXT NOT NULL,
  -- mirrors live ClickUp status name exactly
  current_stage             TEXT NOT NULL,
  -- granular stage within the status
  -- e.g. 'intake_complete' | 'signal_running' | 'demand_signal_gate' |
  --      'coe_pass1_running' | 'coe_pass1_gate' | 'requirements_p1_running' |
  --      'requirements_p1_gate' | 'coe_pass2_running' | 'coe_pass2_gate' |
  --      'requirements_p2_running' | 'delivery_ready_gate' | 'parked'

  -- Gate state
  gate_active               BOOLEAN NOT NULL DEFAULT FALSE,
  gate_type                 TEXT,
  -- 'hard' | 'soft'
  gate_name                 TEXT,
  gate_activated_at         TIMESTAMPTZ,

  -- Classification
  bau_cr                    BOOLEAN NOT NULL DEFAULT FALSE,
  signal_invoked            BOOLEAN NOT NULL DEFAULT FALSE,

  -- Loop prevention
  last_processed_comment_id TEXT,
  last_agent_run_id         UUID,

  -- Stall tracking
  clarification_active      BOOLEAN NOT NULL DEFAULT FALSE,
  clarification_started_at  TIMESTAMPTZ,
  stall_day                 INTEGER NOT NULL DEFAULT 0,
  chase_count               INTEGER NOT NULL DEFAULT 0,

  -- Run identity and artefact linkage (merged from Phase 2 handoff)
  run_number                INTEGER NOT NULL DEFAULT 1,
  run_slug                  TEXT,
  -- e.g. '2026-07-05-869xxxxx-group-alerts-by-subcategory'
  run_folder_path           TEXT,
  -- path to the markdown run folder, if one exists for this run
  trigger_type              TEXT NOT NULL DEFAULT 'manual_claude_project',
  -- 'manual_claude_project' | 'manual_claude_code' | 'clickup_status_change' |
  -- 'scheduled_routine' | 'rerun' | 'resume_after_human_decision'
  triggered_by              TEXT,

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (clickup_ticket_id, run_number)
);
```

---

### 3.2 `agent_runs`

One row per agent invocation. Full audit log of every agent execution.

```sql
CREATE TABLE agent_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,

  agent_name          TEXT NOT NULL,
  -- 'IntakeAgent' | 'SignalAgent' | 'DemandSignalAgent' |
  -- 'CoEAgent_Pass1' | 'CoEAgent_Pass2_Round1' | 'CoEAgent_Pass2_Round2' |
  -- 'RequirementsAgent_Pass1' | 'RequirementsAgent_Pass2' |
  -- 'SolutionShapingAgent'

  -- Idempotency — prevents duplicate runs
  idempotency_key     TEXT NOT NULL UNIQUE,
  -- format: '{clickup_ticket_id}:{agent_name}:{pass_number}'

  status              TEXT NOT NULL DEFAULT 'running',
  -- 'running' | 'complete' | 'partial' | 'failed' | 'low_confidence'

  -- What was passed in
  prompt_version_id   UUID REFERENCES agent_prompt_versions(id),
  context_snapshot    JSONB,
  -- snapshot of inputs: ticket content, Confluence docs fetched,
  -- codebase files fetched, prior agent outputs passed

  source_artefacts    JSONB,
  -- array of {type, reference, fetched_at}
  -- e.g. [{type: 'confluence_page', reference: 'url', fetched_at: ...},
  --        {type: 'github_file', reference: 'path', fetched_at: ...}]

  -- Council composition (CoE Pass 2 runs only)
  council_roster      JSONB,
  -- {recommended: [...], approved: [...], excluded: [{persona, rationale}],
  --  locked_by_hard_rule: [...], refused_edits: [{persona, rule_cited}],
  --  round_count: 1|2}

  -- What came out
  raw_output          JSONB,
  -- full unfiltered output — never written to ClickUp
  approved_summary    TEXT,
  -- filtered summary approved for ClickUp write-back
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT DEFAULT 'Head of Product',

  -- Quality
  confidence_level    TEXT,
  -- 'High' | 'Medium' | 'Low'
  confidence_notes    TEXT,
  output_quality      TEXT,
  -- 'complete' | 'partial' | 'failed'
  quality_notes       TEXT,

  -- Re-run tracking
  rerun_of            UUID REFERENCES agent_runs(id),
  rerun_reason        TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);
```

For CoE Pass 2 runs, council_roster records the full recommendation-to-approval trail. Reduced and full councils are queryable here — the ClickUp tag layer does not distinguish them by design.

---

### 3.3 `gate_decisions`

Every human gate activation and resolution. Named approver, timestamp, AI recommendation vs human decision always distinct.

```sql
CREATE TABLE gate_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id       UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id     TEXT NOT NULL,

  gate_number           INTEGER NOT NULL,
  gate_name             TEXT NOT NULL,
  gate_type             TEXT NOT NULL,
  -- 'hard' | 'soft'

  -- What the AI recommended
  ai_recommendation     TEXT,
  ai_rationale          TEXT,

  -- What the human decided
  activated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  decision              TEXT,
  -- the option chosen — matches decision table in spec/orchestrator/HUMAN_GATE_MODEL.md
  decision_rationale    TEXT,
  decided_by            TEXT DEFAULT 'Head of Product',
  -- always named — never 'AI' or 'System'

  status                TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'modified' | 'rejected' | 'superseded' | 'expired'
  human_response        TEXT,
  -- verbatim response text where available
  human_response_source TEXT,
  -- 'claude_chat' | 'claude_code_chat' | 'clickup_comment' |
  -- 'react_dashboard' | 'slack' | 'manual_admin'
  options_presented     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Reminder tracking
  reminder_sent_at      TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.4 `evidence_records`

Every evidence item found by the Demand Signal Agent. Queryable, gradeable, traceable.

```sql
CREATE TABLE evidence_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  agent_run_id        UUID NOT NULL REFERENCES agent_runs(id),
  clickup_ticket_id   TEXT NOT NULL,

  source_type         TEXT NOT NULL,
  -- 'clickup' | 'confluence' | 'slack' | 'jira' | 'hubspot' |
  -- 'store_visit_note' | 'qbr_document'

  source_reference    TEXT NOT NULL,
  -- URL, ticket ID, channel + date, document title

  summary             TEXT NOT NULL,
  -- what this evidence says and why it is relevant

  grade               TEXT NOT NULL,
  -- 'High' | 'Medium' | 'Low'

  grade_rationale     TEXT,
  discarded           BOOLEAN NOT NULL DEFAULT FALSE,
  discard_reason      TEXT,

  -- Signal assessment
  signal_strength     TEXT,
  -- 'Isolated' | 'Emerging' | 'Established'
  evidence_quality    TEXT,
  -- 'Anecdotal' | 'Observational' | 'Quantified'

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.5 `exception_log`

Every exception raised during orchestration — stalls, conflicts, failures, duplicates.

```sql
CREATE TABLE exception_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,

  exception_type      TEXT NOT NULL,
  -- 'stall_day3' | 'stall_day6' | 'stall_day9' |
  -- 'partial_answer' | 'duplicate_suspected' |
  -- 'conflicting_evidence' | 'low_demand_signal' |
  -- 'agent_failure' | 'gate_no_response' |
  -- 'scope_change' | 'loop_detected' | 'out_of_scope'

  description         TEXT NOT NULL,
  action_taken        TEXT NOT NULL,
  resolved            BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at         TIMESTAMPTZ,
  resolution          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.6 `comment_log`

Every ClickUp comment processed or posted. Primary loop prevention mechanism.

```sql
CREATE TABLE comment_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id       UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id     TEXT NOT NULL,

  clickup_comment_id    TEXT NOT NULL UNIQUE,
  direction             TEXT NOT NULL,
  -- 'inbound' | 'outbound'
  author_type           TEXT NOT NULL,
  -- 'submitter' | 'orchestrator' | 'agent' | 'head_of_product' | 'other'
  comment_type          TEXT,
  -- for outbound: template reference e.g. 'T-01' | 'T-07' | 'T-09'
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.7 `duplicate_candidates`

Suspected duplicates flagged by the Intake Agent.

```sql
CREATE TABLE duplicate_candidates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id         UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id       TEXT NOT NULL,

  candidate_ticket_id     TEXT NOT NULL,
  candidate_ticket_title  TEXT,
  candidate_ticket_url    TEXT,
  rationale               TEXT NOT NULL,
  confidence              TEXT,
  -- 'high' | 'medium' | 'low'

  resolution              TEXT,
  -- 'confirmed_duplicate_parked' | 'confirmed_duplicate_merged' |
  -- 'linked_keep_separate' | 'not_a_duplicate'
  resolved_at             TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.8 `audit_log`

Append-only record of every Orchestrator decision. Never updated, never deleted.

```sql
CREATE TABLE audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,

  event_type          TEXT NOT NULL,
  -- 'stage_transition' | 'agent_invoked' | 'gate_activated' |
  -- 'gate_resolved' | 'comment_posted' | 'tag_added' | 'tag_removed' |
  -- 'stall_detected' | 'exception_raised' | 'exception_resolved' |
  -- 'rerun_requested' | 'ticket_parked' | 'bau_cr_classified'

  from_state          TEXT,
  to_state            TEXT,
  agent_name          TEXT,
  gate_name           TEXT,
  decision            TEXT,
  notes               TEXT,
  performed_by        TEXT NOT NULL DEFAULT 'Orchestrator',
  -- 'Orchestrator' | 'Head of Product' | 'System'

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.9 `output_artefacts`

```sql
CREATE TABLE output_artefacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID NOT NULL REFERENCES workflow_runs(id),
  agent_run_id      UUID REFERENCES agent_runs(id),
  clickup_ticket_id TEXT NOT NULL,

  output_type       TEXT NOT NULL,
  -- 'ticket_intake' | 'context_pack' | 'clarification_questions' |
  -- 'demand_signal_report' | 'coe_pass1_review' | 'coe_pass2_review' |
  -- 'requirements' | 'requirements_delta' | 'solution_design' |
  -- 'test_plan' | 'implementation_handoff' | 'clickup_summary' |
  -- 'retail_context_brief' | 'decision_prompt' | 'context_journal_entry'

  title             TEXT NOT NULL,
  content_markdown  TEXT,
  content_json      JSONB,
  file_path         TEXT,

  version           INTEGER NOT NULL DEFAULT 1,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  supersedes        UUID REFERENCES output_artefacts(id),

  created_by        TEXT NOT NULL DEFAULT 'agent',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Outputs are never overwritten. A revision inserts a new row with version+1, sets is_current=true, points supersedes at the prior row, and flips the prior row's is_current to false.

Context journal entries (see QUORUM.md — Context Journal) are stored as `output_artefacts` rows of type `context_journal_entry`, one row per entry, in addition to existing as lines in the `quorum-tickets/{ticket_folder}/_journal.md` file. The file is the human-readable form; the Supabase rows make it queryable (e.g. "show me every stall event across all tickets this month").

---

## 4. Learning Loop Tables

---

### 4.1 `intake_question_feedback`

```sql
CREATE TABLE intake_question_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID REFERENCES workflow_runs(id),
  clickup_ticket_id TEXT NOT NULL,

  question_text     TEXT NOT NULL,
  question_number   INTEGER,

  feedback          TEXT NOT NULL,
  -- 'necessary' | 'unnecessary' | 'confusing' |
  -- 'already_in_ticket' | 'unanswered_but_progressed'

  feedback_source   TEXT NOT NULL DEFAULT 'head_of_product',
  -- 'head_of_product' | 'submitter_direct' |
  -- 'submitter_behaviour' | 'orchestrator_inferred'

  outcome           TEXT,
  provided_by       TEXT NOT NULL DEFAULT 'Head of Product',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 4.2 `agent_feedback`

```sql
CREATE TABLE agent_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id      UUID NOT NULL REFERENCES agent_runs(id),
  clickup_ticket_id TEXT NOT NULL,
  agent_name        TEXT NOT NULL,

  feedback_type     TEXT NOT NULL,
  -- 'irrelevant_evidence' | 'missing_evidence' | 'wrong_source' |
  -- 'persona_miscalibrated' | 'requirement_wrong' |
  -- 'requirement_descoped' | 'readiness_rating_wrong' | 'other'

  feedback_detail   TEXT,
  affected_item     TEXT,
  provided_by       TEXT NOT NULL DEFAULT 'Head of Product',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 4.3 `agent_prompt_versions`

```sql
CREATE TABLE agent_prompt_versions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name                  TEXT NOT NULL,
  version                     INTEGER NOT NULL,
  prompt_text                 TEXT NOT NULL,
  change_rationale            TEXT NOT NULL,
  created_from_feedback_ids   JSONB,
  active                      BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at                TIMESTAMPTZ,
  activated_by                TEXT DEFAULT 'Head of Product',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_name, version)
);
```

---

### 4.4 `ticket_outcomes`

```sql
CREATE TABLE ticket_outcomes (
  id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id                       UUID REFERENCES workflow_runs(id),
  clickup_ticket_id                     TEXT NOT NULL UNIQUE,

  outcome                               TEXT NOT NULL,
  -- 'built_as_specified' | 'descoped' | 'cancelled_post_approval' |
  -- 'requirements_changed_significantly' | 'delivered_on_time' |
  -- 'delayed' | 'coe_concerns_proved_correct' |
  -- 'demand_signal_proved_accurate' | 'demand_signal_proved_inaccurate'

  outcome_detail                        TEXT,
  which_coe_concerns_proved_correct     TEXT,
  which_demand_signals_proved_accurate  TEXT,
  bau_cr_classification_was_correct     BOOLEAN,
  readiness_rating_was_accurate         BOOLEAN,
  recorded_by                           TEXT DEFAULT 'Head of Product',
  recorded_at                           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 4.5 `domain_experts`

```sql
CREATE TABLE domain_experts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name           TEXT NOT NULL,
  slack_user_id         TEXT,

  domain                TEXT NOT NULL,
  -- 'availability_alerting' | 'inventory_accuracy' | 'waste' |
  -- 'store_colleague_behaviour' | 'client_configuration' |
  -- 'retail_operations' | 'data_science' | 'platform_architecture'

  evidence_of_expertise JSONB,
  -- [{source, date, summary}]

  mention_count         INTEGER DEFAULT 0,
  last_active           TIMESTAMPTZ,
  suggested_count       INTEGER DEFAULT 0,
  consulted_count       INTEGER DEFAULT 0,
  -- how many times the suggestion was actually acted on

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Indexes

```sql
-- Workflow state lookups
CREATE INDEX idx_wr_clickup_id ON workflow_runs(clickup_ticket_id);
CREATE INDEX idx_wr_status ON workflow_runs(clickup_status);
CREATE INDEX idx_wr_gate ON workflow_runs(gate_active) WHERE gate_active = TRUE;
CREATE INDEX idx_wr_stall ON workflow_runs(clarification_active) WHERE clarification_active = TRUE;

-- Agent run lookups
CREATE INDEX idx_ar_workflow ON agent_runs(workflow_run_id);
CREATE INDEX idx_ar_agent ON agent_runs(agent_name);
CREATE INDEX idx_ar_status ON agent_runs(status);
CREATE INDEX idx_ar_idempotency ON agent_runs(idempotency_key);

-- Gate decisions
CREATE INDEX idx_gd_workflow ON gate_decisions(workflow_run_id);
CREATE INDEX idx_gd_unresolved ON gate_decisions(resolved_at) WHERE resolved_at IS NULL;

-- Evidence
CREATE INDEX idx_er_workflow ON evidence_records(workflow_run_id);
CREATE INDEX idx_er_grade ON evidence_records(grade);
CREATE INDEX idx_er_source ON evidence_records(source_type);

-- Loop prevention
CREATE INDEX idx_cl_comment_id ON comment_log(clickup_comment_id);

-- Audit
CREATE INDEX idx_al_workflow ON audit_log(workflow_run_id);
CREATE INDEX idx_al_event ON audit_log(event_type);
CREATE INDEX idx_al_created ON audit_log(created_at);

-- Learning loop
CREATE INDEX idx_iqf_ticket ON intake_question_feedback(clickup_ticket_id);
CREATE INDEX idx_iqf_source ON intake_question_feedback(feedback_source);
CREATE INDEX idx_apv_agent ON agent_prompt_versions(agent_name);
CREATE INDEX idx_apv_active ON agent_prompt_versions(active) WHERE active = TRUE;
CREATE INDEX idx_de_domain ON domain_experts(domain);
```

---

## 6. Key Queries

### Active gates — what needs Head of Product attention
```sql
SELECT
  wr.clickup_ticket_id,
  wr.title,
  wr.current_stage,
  gd.gate_name,
  gd.gate_type,
  gd.ai_recommendation,
  gd.activated_at
FROM workflow_runs wr
JOIN gate_decisions gd ON gd.workflow_run_id = wr.id
WHERE wr.gate_active = TRUE
  AND gd.resolved_at IS NULL
ORDER BY gd.activated_at ASC;
```

### Stalled tickets
```sql
SELECT
  clickup_ticket_id,
  title,
  stall_day,
  clarification_started_at,
  chase_count
FROM workflow_runs
WHERE clarification_active = TRUE
  AND stall_day > 0
ORDER BY stall_day DESC, clarification_started_at ASC;
```

### Full agent run history for a ticket
```sql
SELECT
  agent_name,
  status,
  confidence_level,
  output_quality,
  prompt_version_id,
  created_at,
  completed_at
FROM agent_runs
WHERE clickup_ticket_id = $1
ORDER BY created_at ASC;
```

### Idempotency check before invoking an agent
```sql
SELECT id, status FROM agent_runs
WHERE idempotency_key = $1
LIMIT 1;
```

### Full audit trail for a ticket
```sql
SELECT
  event_type,
  from_state,
  to_state,
  agent_name,
  gate_name,
  decision,
  notes,
  performed_by,
  created_at
FROM audit_log
WHERE clickup_ticket_id = $1
ORDER BY created_at ASC;
```

### Evidence quality by source type
```sql
SELECT
  source_type,
  grade,
  COUNT(*) as count,
  SUM(CASE WHEN discarded THEN 1 ELSE 0 END) as discarded_count
FROM evidence_records
GROUP BY source_type, grade
ORDER BY source_type, grade;
```

### Intake question quality — automatic signals
```sql
SELECT
  question_text,
  feedback,
  feedback_source,
  COUNT(*) as frequency
FROM intake_question_feedback
WHERE feedback IN ('unnecessary', 'already_in_ticket', 'unanswered_but_progressed')
GROUP BY question_text, feedback, feedback_source
ORDER BY frequency DESC
LIMIT 10;
```

### CoE concern accuracy over time
```sql
SELECT
  which_coe_concerns_proved_correct,
  COUNT(*) as frequency
FROM ticket_outcomes
WHERE which_coe_concerns_proved_correct IS NOT NULL
GROUP BY which_coe_concerns_proved_correct
ORDER BY frequency DESC;
```

---

## 7. Idempotency Rules

Before invoking any agent, the Orchestrator must:

1. Compute the idempotency key: `{clickup_ticket_id}:{agent_name}:{pass_number}`
2. Query `agent_runs` for an existing record with this key
3. If found and status is `complete`: do not re-invoke. Use the existing output.
4. If found and status is `running`: do not re-invoke. Wait.
5. If found and status is `failed`: re-invoke only with explicit Head of Product instruction.
6. If not found: invoke the agent and insert the record immediately with status `running`.

This prevents duplicate runs caused by comment re-processing, scheduled trigger overlap, or manual re-invocation.

---

## 8. Phase 1 → Phase 2 Bootstrap

When Phase 2 Managed Agent is deployed:

1. All in-flight tickets bootstrapped into `workflow_runs` from ClickUp current state
2. `last_processed_comment_id` set to most recent comment on each ticket
3. `audit_log` starts from deployment date — pre-Phase 2 history lives in ClickUp comments only
4. ClickUp status and tags continue to be written — they are not retired
5. Supabase becomes the authoritative read source for all routing decisions

---

## 9. Setup

- Supabase project on Retail Insight account
- Apply schema in order: workflow_runs → agent_prompt_versions → agent_runs → all others
- Row-level security: all tables restricted to service role — no public access
- Connection string stored in Managed Agents vault as environment variable
- Begin populating from first ticket — no pre-seeding required
