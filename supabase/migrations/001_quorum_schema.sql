CREATE TABLE workflow_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_ticket_id         TEXT NOT NULL,
  clickup_list_id           TEXT NOT NULL,
  product                   TEXT NOT NULL,
  title                     TEXT NOT NULL,
  clickup_status            TEXT NOT NULL,
  current_stage             TEXT NOT NULL,
  gate_active               BOOLEAN NOT NULL DEFAULT FALSE,
  gate_type                 TEXT,
  gate_name                 TEXT,
  gate_activated_at         TIMESTAMPTZ,
  bau_cr                    BOOLEAN NOT NULL DEFAULT FALSE,
  signal_invoked            BOOLEAN NOT NULL DEFAULT FALSE,
  last_processed_comment_id TEXT,
  last_agent_run_id         UUID,
  clarification_active      BOOLEAN NOT NULL DEFAULT FALSE,
  clarification_started_at  TIMESTAMPTZ,
  stall_day                 INTEGER NOT NULL DEFAULT 0,
  chase_count               INTEGER NOT NULL DEFAULT 0,
  run_number                INTEGER NOT NULL DEFAULT 1,
  run_slug                  TEXT,
  run_folder_path           TEXT,
  trigger_type              TEXT NOT NULL DEFAULT 'manual_claude_project',
  triggered_by              TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clickup_ticket_id, run_number)
);

CREATE TABLE agent_prompt_versions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name                  TEXT NOT NULL,
  version                     INTEGER NOT NULL,
  prompt_text                 TEXT NOT NULL,
  change_rationale            TEXT NOT NULL,
  created_from_feedback_ids   JSONB,
  active                      BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at                TIMESTAMPTZ,
  activated_by                TEXT DEFAULT 'Product Manager',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_name, version)
);

CREATE TABLE agent_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,
  agent_name          TEXT NOT NULL,
  idempotency_key     TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'running',
  prompt_version_id   UUID REFERENCES agent_prompt_versions(id),
  context_snapshot    JSONB,
  source_artefacts    JSONB,
  council_roster      JSONB,
  raw_output          JSONB,
  approved_summary    TEXT,
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT DEFAULT 'Product Manager',
  confidence_level    TEXT,
  confidence_notes    TEXT,
  output_quality      TEXT,
  quality_notes       TEXT,
  rerun_of            UUID REFERENCES agent_runs(id),
  rerun_reason        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE gate_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id       UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id     TEXT NOT NULL,
  gate_number           INTEGER NOT NULL,
  gate_name             TEXT NOT NULL,
  gate_type             TEXT NOT NULL,
  ai_recommendation     TEXT,
  ai_rationale          TEXT,
  activated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  decision              TEXT,
  decision_rationale    TEXT,
  decided_by            TEXT DEFAULT 'Product Manager',
  status                TEXT NOT NULL DEFAULT 'pending',
  human_response        TEXT,
  human_response_source TEXT,
  options_presented     JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminder_sent_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evidence_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  agent_run_id        UUID NOT NULL REFERENCES agent_runs(id),
  clickup_ticket_id   TEXT NOT NULL,
  source_type         TEXT NOT NULL,
  source_reference    TEXT NOT NULL,
  summary             TEXT NOT NULL,
  grade               TEXT NOT NULL,
  grade_rationale     TEXT,
  discarded           BOOLEAN NOT NULL DEFAULT FALSE,
  discard_reason      TEXT,
  signal_strength     TEXT,
  evidence_quality    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exception_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,
  exception_type      TEXT NOT NULL,
  description         TEXT NOT NULL,
  action_taken        TEXT NOT NULL,
  resolved            BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at         TIMESTAMPTZ,
  resolution          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id       UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id     TEXT NOT NULL,
  clickup_comment_id    TEXT NOT NULL UNIQUE,
  direction             TEXT NOT NULL,
  author_type           TEXT NOT NULL,
  comment_type          TEXT,
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE duplicate_candidates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id         UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id       TEXT NOT NULL,
  candidate_ticket_id     TEXT NOT NULL,
  candidate_ticket_title  TEXT,
  candidate_ticket_url    TEXT,
  rationale               TEXT NOT NULL,
  confidence              TEXT,
  resolution              TEXT,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id),
  clickup_ticket_id   TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  from_state          TEXT,
  to_state            TEXT,
  agent_name          TEXT,
  gate_name           TEXT,
  decision            TEXT,
  notes               TEXT,
  performed_by        TEXT NOT NULL DEFAULT 'Orchestrator',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE output_artefacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID NOT NULL REFERENCES workflow_runs(id),
  agent_run_id      UUID REFERENCES agent_runs(id),
  clickup_ticket_id TEXT NOT NULL,
  output_type       TEXT NOT NULL,
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

CREATE TABLE intake_question_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id   UUID REFERENCES workflow_runs(id),
  clickup_ticket_id TEXT NOT NULL,
  question_text     TEXT NOT NULL,
  question_number   INTEGER,
  feedback          TEXT NOT NULL,
  feedback_source   TEXT NOT NULL DEFAULT 'head_of_product',
  outcome           TEXT,
  provided_by       TEXT NOT NULL DEFAULT 'Product Manager',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id      UUID NOT NULL REFERENCES agent_runs(id),
  clickup_ticket_id TEXT NOT NULL,
  agent_name        TEXT NOT NULL,
  feedback_type     TEXT NOT NULL,
  feedback_detail   TEXT,
  affected_item     TEXT,
  provided_by       TEXT NOT NULL DEFAULT 'Product Manager',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_outcomes (
  id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id                       UUID REFERENCES workflow_runs(id),
  clickup_ticket_id                     TEXT NOT NULL UNIQUE,
  outcome                               TEXT NOT NULL,
  outcome_detail                        TEXT,
  which_coe_concerns_proved_correct     TEXT,
  which_demand_signals_proved_accurate  TEXT,
  bau_cr_classification_was_correct     BOOLEAN,
  readiness_rating_was_accurate         BOOLEAN,
  recorded_by                           TEXT DEFAULT 'Product Manager',
  recorded_at                           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domain_experts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name           TEXT NOT NULL,
  slack_user_id         TEXT,
  domain                TEXT NOT NULL,
  evidence_of_expertise JSONB,
  mention_count         INTEGER DEFAULT 0,
  last_active           TIMESTAMPTZ,
  suggested_count       INTEGER DEFAULT 0,
  consulted_count       INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wr_clickup_id ON workflow_runs(clickup_ticket_id);
CREATE INDEX idx_wr_status ON workflow_runs(clickup_status);
CREATE INDEX idx_wr_gate ON workflow_runs(gate_active) WHERE gate_active = TRUE;
CREATE INDEX idx_wr_stall ON workflow_runs(clarification_active) WHERE clarification_active = TRUE;

CREATE INDEX idx_ar_clickup_id ON agent_runs(clickup_ticket_id);
CREATE INDEX idx_ar_workflow ON agent_runs(workflow_run_id);
CREATE INDEX idx_ar_agent ON agent_runs(agent_name);
CREATE INDEX idx_ar_status ON agent_runs(status);
CREATE INDEX idx_ar_idempotency ON agent_runs(idempotency_key);

CREATE INDEX idx_gd_clickup_id ON gate_decisions(clickup_ticket_id);
CREATE INDEX idx_gd_workflow ON gate_decisions(workflow_run_id);
CREATE INDEX idx_gd_unresolved ON gate_decisions(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX idx_er_clickup_id ON evidence_records(clickup_ticket_id);
CREATE INDEX idx_er_workflow ON evidence_records(workflow_run_id);
CREATE INDEX idx_er_grade ON evidence_records(grade);
CREATE INDEX idx_er_source ON evidence_records(source_type);

CREATE INDEX idx_el_clickup_id ON exception_log(clickup_ticket_id);
CREATE INDEX idx_el_workflow ON exception_log(workflow_run_id);

CREATE INDEX idx_cl_clickup_id ON comment_log(clickup_ticket_id);
CREATE INDEX idx_cl_workflow ON comment_log(workflow_run_id);
CREATE INDEX idx_cl_comment_id ON comment_log(clickup_comment_id);

CREATE INDEX idx_dc_clickup_id ON duplicate_candidates(clickup_ticket_id);
CREATE INDEX idx_dc_workflow ON duplicate_candidates(workflow_run_id);

CREATE INDEX idx_al_clickup_id ON audit_log(clickup_ticket_id);
CREATE INDEX idx_al_workflow ON audit_log(workflow_run_id);
CREATE INDEX idx_al_event ON audit_log(event_type);
CREATE INDEX idx_al_created ON audit_log(created_at);

CREATE INDEX idx_oa_clickup_id ON output_artefacts(clickup_ticket_id);
CREATE INDEX idx_oa_workflow ON output_artefacts(workflow_run_id);

CREATE INDEX idx_iqf_ticket ON intake_question_feedback(clickup_ticket_id);
CREATE INDEX idx_iqf_workflow ON intake_question_feedback(workflow_run_id);
CREATE INDEX idx_iqf_source ON intake_question_feedback(feedback_source);

CREATE INDEX idx_af_clickup_id ON agent_feedback(clickup_ticket_id);
CREATE INDEX idx_af_agent_run ON agent_feedback(agent_run_id);

CREATE INDEX idx_to_clickup_id ON ticket_outcomes(clickup_ticket_id);
CREATE INDEX idx_to_workflow ON ticket_outcomes(workflow_run_id);

CREATE INDEX idx_apv_agent ON agent_prompt_versions(agent_name);
CREATE INDEX idx_apv_active ON agent_prompt_versions(active) WHERE active = TRUE;
CREATE INDEX idx_de_domain ON domain_experts(domain);
