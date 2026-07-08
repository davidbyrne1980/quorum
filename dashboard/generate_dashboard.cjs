#!/usr/bin/env node
/*
 * Quorum Dashboard Generator
 * --------------------------
 * Builds a dependency-free, read-only dashboard from the ticket-centric local
 * Quorum markdown tree:
 *
 *   quorum-tickets/{ticket_folder}/
 *     _ticket.md
 *     _journal.md
 *     scores/QUIP_score_v{n}.md
 *     runs/{YYYY-MM-DD}__run-{NN}/00_...10_*.md
 *
 * Usage: node dashboard/generate_dashboard.cjs
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const TICKETS_DIR = path.join(ROOT, 'quorum-tickets');
const OUT_FILE = path.join(SCRIPT_DIR, 'quorum_dashboard.html');

const ROADMAP_STATUSES = [
  'Submitted',
  'Triage',
  'Validation',
  'COE Review',
  'Define & Design',
  'Ready for Scheduling',
  'Scheduled',
  'Build & Deploy',
  'Release & GTM',
];

const AGENT_COUNTERS = [
  'Intake',
  'Demand Signal',
  'CoE Pass 1',
  'CoE Pass 2',
  'Requirements',
  'QUIP Scoring',
  'Solution Shaping',
  'Test Planning',
];

const ARTEFACTS = [
  { num: '00', label: 'Run manifest', fileName: '00_run_manifest.md', agent: null },
  { num: '01', label: 'Ticket intake', fileName: '01_ticket_intake.md', agent: 'Intake' },
  { num: '02', label: 'Context pack', fileName: '02_context_pack.md', agent: 'Demand Signal' },
  { num: '03', label: 'Persona recommendation', fileName: '03_persona_recommendation.md', agent: 'CoE Pass 1' },
  { num: '04', label: 'Clarification questions', fileName: '04_clarification_questions.md', agent: 'Intake' },
  { num: '05', label: 'Requirements', fileName: '05_requirements.md', agent: 'Requirements' },
  { num: '06', label: 'Solution design', fileName: '06_solution_design.md', agent: 'Solution Shaping' },
  { num: '07', label: 'Test plan', fileName: '07_test_plan.md', agent: 'Test Planning' },
  { num: '08', label: 'Human decisions', fileName: '08_human_decisions.md', agent: null },
  { num: '09', label: 'Implementation handoff', fileName: '09_implementation_handoff.md', agent: null },
  { num: '10', label: 'ClickUp summary', fileName: '10_clickup_summary.md', agent: null },
];

const GATE_TYPES = {
  D01: 'soft',
  D02: 'soft',
  D03: 'hard',
  D04: 'hard',
  D05: 'soft',
  D06: 'hard',
  D07: 'soft',
  D08: 'hard',
};

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function listDirs(dirPath) {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function listFiles(dirPath) {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function htmlEscape(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attrEscape(value) {
  return htmlEscape(value).replace(/\n/g, '&#10;');
}

function slugId(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitByHeading(text, level) {
  const marker = '#'.repeat(level) + ' ';
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of String(text || '').split(/\r?\n/)) {
    const isHeading = line.startsWith(marker) && !line.startsWith('#'.repeat(level + 1) + ' ');
    if (isHeading) {
      sections.push(current);
      current = { heading: line.slice(marker.length).trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function firstNonEmpty(lines) {
  for (const line of lines || []) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function parseKeyValues(lines) {
  const out = {};
  for (const raw of lines || []) {
    const line = raw
      .replace(/^\s*[-*]\s+/, '')
      .replace(/\*\*/g, '')
      .trim();
    const match = line.match(/^([A-Za-z0-9 /_-]+):\s*(.*)$/);
    if (match) out[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return out;
}

function parseNumberedList(lines) {
  const out = [];
  for (const raw of lines || []) {
    const match = raw.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (match) out.push(match[2].trim());
  }
  return out;
}

function isTbc(value) {
  return !value || /^\[?TBC/i.test(String(value).trim()) || /\[TBC/i.test(String(value));
}

function cleanValue(value) {
  return String(value || '').replace(/`/g, '').trim();
}

function normalizeStatus(value) {
  const cleaned = cleanValue(value).replace(/^\d+\.\s*/, '');
  const exact = ROADMAP_STATUSES.find((s) => s.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const partial = ROADMAP_STATUSES.find((s) => cleaned.toLowerCase().includes(s.toLowerCase()));
  return partial || cleaned;
}

function parseTags(value) {
  if (!value || isTbc(value)) return [];
  return String(value)
    .split(/[,;|]/)
    .map((tag) => tag.trim().replace(/^[-*]\s+/, ''))
    .filter(Boolean);
}

function splitTicketFolder(folder) {
  const [id, ...rest] = folder.split('__');
  return { id: id || '', slug: rest.join('__') || folder };
}

function hrefFor(...parts) {
  return `../${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}

function markdownLinkHref(ticketFolder, href) {
  if (!href) return '';
  if (/^[a-z]+:/i.test(href) || href.startsWith('/')) return href;
  return hrefFor('quorum-tickets', ticketFolder, ...href.split(/[\\/]+/).filter(Boolean));
}

function parseTicketIndex(text) {
  const out = {};
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  const title = lines.find((line) => /^#\s+/.test(line));
  const kv = parseKeyValues(lines);
  out.title = title ? title.replace(/^#\s+/, '').trim() : '';
  out.ticketId = cleanValue(kv['clickup id']);
  out.ticketUrl = cleanValue(kv['clickup url']);
  out.product = cleanValue(kv.product);
  out.status = normalizeStatus(kv['live clickup status']);
  out.stage = cleanValue(kv['current pdlc stage']);
  out.created = cleanValue(kv.created);
  out.latestScore = cleanValue(kv['latest quip score']);
  return out;
}

function parseRunManifest(text) {
  const out = {
    runSlug: '',
    ticketId: '',
    ticketUrl: '',
    roadmapStatus: '',
    tags: [],
    title: '',
    objective: '',
    currentStatus: '',
    currentStage: '',
    currentGate: '',
    runDate: '',
    decisions: [],
  };
  if (!text) return out;

  for (const section of splitByHeading(text, 2)) {
    const heading = (section.heading || '').toLowerCase();
    if (heading === 'run id') {
      out.runSlug = firstNonEmpty(section.lines);
      const dateMatch = out.runSlug.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) out.runDate = dateMatch[1];
    } else if (heading === 'source ticket') {
      const kv = parseKeyValues(section.lines);
      out.ticketId = cleanValue(kv['ticket id']);
      out.ticketUrl = cleanValue(kv['ticket url']);
      out.roadmapStatus = normalizeStatus(kv['live clickup status']);
      out.tags = parseTags(kv['active tags']);
    } else if (heading === 'objective') {
      out.objective = firstNonEmpty(section.lines);
      out.title = out.objective;
    } else if (heading === 'current status') {
      out.currentStatus = cleanValue(firstNonEmpty(section.lines));
    } else if (heading === 'current stage') {
      out.currentStage = cleanValue(firstNonEmpty(section.lines));
    } else if (heading === 'current gate') {
      out.currentGate = cleanValue(firstNonEmpty(section.lines));
    } else if (heading === 'created at') {
      out.runDate = cleanValue(firstNonEmpty(section.lines)) || out.runDate;
    } else if (heading === 'human decisions') {
      out.decisions = parseManifestDecisions(section.lines.join('\n'));
    }
  }
  return out;
}

function parseManifestDecisions(text) {
  return splitByHeading(text || '', 3)
    .filter((section) => section.heading)
    .map((section) => {
      const idMatch = section.heading.match(/^(D\d+)\b\s*[-–—]?\s*(.*)$/);
      const id = idMatch ? idMatch[1] : section.heading;
      const title = idMatch ? idMatch[2].trim() : '';
      const kv = parseKeyValues(section.lines);
      const optionStart = section.lines.findIndex((line) => /^options:?\s*$/i.test(line.trim()));
      const options = optionStart >= 0 ? parseNumberedList(section.lines.slice(optionStart + 1)) : [];
      return {
        id,
        title,
        gate: title,
        type: GATE_TYPES[id] || '',
        status: cleanValue(kv.status).toLowerCase(),
        recommendation: cleanValue(kv.recommendation),
        decision: cleanValue(kv.decision),
        options,
      };
    });
}

function sectionTextMap(text) {
  const out = {};
  for (const section of splitByHeading(text || '', 2)) {
    if (section.heading) out[section.heading.toLowerCase()] = section.lines;
  }
  return out;
}

function parseDecisionLog(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+D\d+\b/.test(lines[i])) starts.push(i);
  }

  const decisions = [];
  for (let i = 0; i < starts.length; i++) {
    const block = lines.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : lines.length).join('\n');
    const heading = block.split(/\r?\n/)[0].replace(/^##\s+/, '').trim();
    const idMatch = heading.match(/^(D\d+)\b\s*[-–—]?\s*(.*)$/);
    const id = idMatch ? idMatch[1] : heading;
    const title = idMatch ? idMatch[2].trim() : '';
    const sections = sectionTextMap(block);
    const front = [];
    for (const line of block.split(/\r?\n/).slice(1)) {
      if (/^##\s+/.test(line)) break;
      front.push(line);
    }
    const kv = parseKeyValues(front);
    decisions.push({
      id,
      title,
      gate: cleanValue(kv.gate) || title,
      type: cleanValue(kv.type) || GATE_TYPES[id] || '',
      status: cleanValue(kv.status).toLowerCase(),
      requestedAt: cleanValue(kv['requested at']),
      resolvedAt: cleanValue(kv['resolved at']),
      decidedBy: cleanValue(kv['decided by']),
      rationale: joinText(sections.rationale),
      options: parseNumberedList(sections['options presented']),
      humanResponse: joinText(sections['human response']),
      recordedDecision: joinText(sections['recorded decision']),
      recordedAction: joinText(sections['recorded action']),
    });
  }
  return decisions;
}

function joinText(lines) {
  return (lines || [])
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function parseArtefactPresence(runDir, ticketFolder, runFolder) {
  const files = new Set(listFiles(runDir));
  return ARTEFACTS.map((artefact) => {
    const exists = files.has(artefact.fileName);
    return {
      label: artefact.label,
      fileName: artefact.fileName,
      runSlug: runFolder,
      href: exists ? hrefFor('quorum-tickets', ticketFolder, 'runs', runFolder, artefact.fileName) : '',
      exists,
      agent: artefact.agent,
    };
  });
}

function parseLatestQuipScore(scoresDir, ticketFolder) {
  const scores = listFiles(scoresDir)
    .filter((fileName) => /^QUIP_score_v\d+\.md$/i.test(fileName))
    .map((fileName) => {
      const version = Number(fileName.match(/^QUIP_score_v(\d+)\.md$/i)[1]);
      const text = readFileSafe(path.join(scoresDir, fileName)) || '';
      const statusMatch = text.match(/\*\*Score Status:\*\*\s*([a-z-]+)/i);
      const totalMatch = text.match(/^Total Score:\s*([\d.]+)\s*$/m);
      const openQuestions = parseQuipQuestions(text);
      return {
        version,
        fileName,
        href: hrefFor('quorum-tickets', ticketFolder, 'scores', fileName),
        status: statusMatch ? statusMatch[1].trim() : 'unknown',
        totalScore: totalMatch ? totalMatch[1] : null,
        hasOpenQuestions: openQuestions.length > 0 || /provisional/i.test(statusMatch ? statusMatch[1] : ''),
        openQuestions,
      };
    })
    .sort((a, b) => a.version - b.version);

  return {
    scores,
    latest: scores.length ? scores[scores.length - 1] : null,
  };
}

function parseQuipQuestions(text) {
  const marker = '<!-- quip:open-questions -->';
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return [];
  const questions = [];
  for (const raw of text.slice(markerIndex + marker.length).split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('##')) break;
    if (/^none\b/i.test(line)) return [];
    if (line.startsWith('- ')) questions.push(line.slice(2).trim());
  }
  return questions;
}

function parseContextJournal(text, ticketFolder) {
  const journal = [];
  if (!text) return journal;
  let current = null;

  function flush() {
    if (!current) return;
    const linkLine = current.lines.find((line) => /^→\s*Full detail:/i.test(line.trim()));
    const linkMatch = linkLine ? linkLine.match(/\[([^\]]+)\]\(([^)]+)\)/) : null;
    current.summary = current.lines
      .filter((line) => !/^→\s*Full detail:/i.test(line.trim()))
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' ');
    current.href = linkMatch ? markdownLinkHref(ticketFolder, linkMatch[2]) : hrefFor('quorum-tickets', ticketFolder, '_journal.md');
    delete current.lines;
    journal.push(current);
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^###\s+(.*)$/);
    if (match) {
      flush();
      const header = match[1].trim();
      const parts = header.split(/\s+[—–-]\s+/);
      current = {
        date: parts[0] || '',
        type: parts.length > 1 ? parts.slice(1).join(' - ') : '',
        summary: '',
        href: '',
        lines: [],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return journal;
}

function listRunFolders(ticketDir) {
  return listDirs(path.join(ticketDir, 'runs'));
}

function buildRun(ticketFolder, ticketDir, runFolder) {
  const runDir = path.join(ticketDir, 'runs', runFolder);
  const manifest = parseRunManifest(readFileSafe(path.join(runDir, '00_run_manifest.md')));
  const decisionLog = parseDecisionLog(readFileSafe(path.join(runDir, '08_human_decisions.md')));
  const manifestPending = manifest.decisions.find((decision) => decision.status === 'pending');
  const logPending = decisionLog.find((decision) => decision.status === 'pending');
  const pendingGate = logPending || manifestPending || null;
  return {
    runSlug: runFolder,
    runDate: manifest.runDate || runFolder.slice(0, 10),
    manifest,
    decisions: decisionLog.length ? decisionLog : manifest.decisions,
    pendingGate,
    artefacts: parseArtefactPresence(runDir, ticketFolder, runFolder),
  };
}

function buildTicketModel() {
  return listDirs(TICKETS_DIR).map((ticketFolder) => {
    const ticketDir = path.join(TICKETS_DIR, ticketFolder);
    const folderParts = splitTicketFolder(ticketFolder);
    const ticketIndex = parseTicketIndex(readFileSafe(path.join(ticketDir, '_ticket.md')));
    const runs = listRunFolders(ticketDir).map((runFolder) => buildRun(ticketFolder, ticketDir, runFolder));
    const newestRun = runs[runs.length - 1] || null;
    const newestManifest = newestRun ? newestRun.manifest : {};
    const allTags = unique([
      ...(newestManifest.tags || []),
      ...runs.flatMap((run) => run.manifest.tags || []),
    ]);
    const quipBundle = parseLatestQuipScore(path.join(ticketDir, 'scores'), ticketFolder);
    const journal = parseContextJournal(readFileSafe(path.join(ticketDir, '_journal.md')), ticketFolder);
    const pendingGate = runs.map((run) => run.pendingGate).find(Boolean) || null;
    const ticketId = cleanValue(ticketIndex.ticketId || newestManifest.ticketId || folderParts.id);
    const title = cleanValue(ticketIndex.title || newestManifest.title || folderParts.slug.replace(/-/g, ' '));
    const roadmapStatus = normalizeStatus(ticketIndex.status || newestManifest.roadmapStatus || newestManifest.currentStatus || '');
    const sourceState = {
      status: roadmapStatus,
      readOrder: ['status', 'closed', 'human-review-required', 'progress-tags', 'state-tags', 'last-comment'],
      lastComment: '',
    };
    const ticket = {
      ticketFolder,
      ticketId: isTbc(ticketId) ? 'TBC' : ticketId,
      clickupUrl: cleanValue(ticketIndex.ticketUrl || newestManifest.ticketUrl || ''),
      title,
      product: cleanValue(ticketIndex.product),
      roadmapStatus,
      tags: allTags,
      category: '',
      interpretedState: '',
      currentGate: pendingGate ? pendingGate.gate || pendingGate.title || pendingGate.id : '',
      gateType: pendingGate ? normalizeGateType(pendingGate.type || GATE_TYPES[pendingGate.id]) : '',
      daysOpen: deriveDaysOpen(pendingGate),
      decisionOptions: pendingGate ? pendingGate.options : [],
      recommendation: pendingGate ? deriveRecommendation(pendingGate) : '',
      recommendationPrompt: '',
      nextStep: '',
      runs,
      artefacts: runs.flatMap((run) => run.artefacts),
      quip: quipBundle.latest,
      quipScores: quipBundle.scores,
      journal,
      sourceState,
      currentStage: cleanValue(ticketIndex.stage || newestManifest.currentStage || ''),
      summary: cleanValue(newestManifest.objective || ticketIndex.product || ''),
      pendingGate,
    };
    ticket.category = deriveQueueCategory(ticket);
    ticket.interpretedState = deriveInterpretedState(ticket);
    ticket.nextStep = deriveNextStep(ticket);
    ticket.recommendationPrompt = deriveRecommendationPrompt(ticket);
    return ticket;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeGateType(value) {
  const lower = String(value || '').toLowerCase();
  if (lower.includes('hard')) return 'hard';
  if (lower.includes('soft')) return 'soft';
  return lower || 'gate';
}

function deriveDaysOpen(gate) {
  if (!gate || !gate.requestedAt || isTbc(gate.requestedAt)) return null;
  const opened = new Date(`${gate.requestedAt}T00:00:00Z`);
  if (Number.isNaN(opened.getTime())) return null;
  const now = new Date();
  return Math.max(0, Math.floor((now - opened) / 86400000));
}

function deriveRecommendation(gate) {
  if (!gate) return '';
  if (gate.recommendation && !isTbc(gate.recommendation)) return gate.recommendation;
  const approve = (gate.options || []).find((option) => /approve|proceed|confirm/i.test(option));
  return approve || (gate.options || [])[0] || '';
}

function deriveQueueCategory(ticket) {
  const tags = ticket.tags.map((tag) => tag.toLowerCase());
  if (tags.includes('closed')) return 'closed';
  if (tags.includes('human-review-required') || ticket.pendingGate) return 'awaiting-me';
  if (tags.includes('awaiting-info') || tags.includes('stalled')) return 'awaiting-others';
  return 'in-progress';
}

function deriveInterpretedState(ticket) {
  if (ticket.category === 'closed') return 'Closed by tag';
  if (ticket.category === 'awaiting-me') return ticket.currentGate ? `Open human gate: ${ticket.currentGate}` : 'Open human gate';
  if (ticket.category === 'awaiting-others') return 'Awaiting submitter or external input';
  if (ticket.roadmapStatus) return `In ${ticket.roadmapStatus}`;
  return 'In progress';
}

function hasTag(ticket, tag) {
  return ticket.tags.some((value) => value.toLowerCase() === tag);
}

function deriveNextStep(ticket) {
  if (ticket.category === 'closed') return 'Stopped. Reopening requires the Head of Product to remove the closed tag.';
  if (ticket.pendingGate) {
    return `Review ${ticket.currentGate || 'the open gate'} and record the decision in Claude Code.`;
  }
  if (hasTag(ticket, 'awaiting-info') || hasTag(ticket, 'stalled')) {
    return 'Wait for submitter input; follow the stall cadence if no response arrives.';
  }

  const status = ticket.roadmapStatus;
  if (status === 'Submitted') return 'Run intake, then move to Validation when intake is complete.';
  if (status === 'Validation') return hasTag(ticket, 'coe-pass-1-complete') ? 'Move to COE Review.' : 'Run CoE Pass 1, then move to COE Review.';
  if (status === 'COE Review') return 'Resolve Gate 4; if approved, move to Define & Design.';
  if (status === 'Define & Design') {
    if (!hasTag(ticket, 'requirements-added')) return 'Run Requirements Agent and open Gate 5.';
    if (hasTag(ticket, 'bau-cr-signal')) return 'Resolve BAU/CR Gate 6a, then move to Ready for Scheduling if confirmed.';
    return 'Run CoE Pass 2, then proceed to delivery readiness.';
  }
  if (status === 'Ready for Scheduling') return 'Resolve Gate 8; if approved, move to Scheduled.';
  if (status === 'Scheduled') return 'Orchestrator scope complete.';
  if (status === 'Build & Deploy' || status === 'Release & GTM') return 'Out of Quorum Orchestrator scope.';
  return 'No next step can be derived from the local source files.';
}

function deriveRecommendationPrompt(ticket) {
  if (!ticket.pendingGate) return '';
  const promptTicketId = ticket.ticketId === 'TBC' ? ticket.ticketFolder : ticket.ticketId;
  const recommendation = stripTrailingPunctuation(ticket.recommendation || 'Review required');
  const reason =
    ticket.pendingGate.rationale ||
    ticket.pendingGate.recordedAction ||
    ticket.summary ||
    'The local Quorum artefacts show this gate is pending.';
  return [
    `For ticket ${promptTicketId}, my recommendation is: ${recommendation}.`,
    `Gate: ${ticket.currentGate || 'Open human gate'}.`,
    `Reason: ${oneSentence(reason)}.`,
    'Please record the decision in Quorum and continue the Orchestrator from the current state.',
  ].join('\n');
}

function stripTrailingPunctuation(text) {
  return String(text || '').trim().replace(/[.!?]+$/, '');
}

function oneSentence(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'The local Quorum artefacts show this gate is pending';
  const match = cleaned.match(/^(.{1,220}?)([.!?])(\s|$)/);
  return (match ? match[1] : cleaned.slice(0, 220)).replace(/[.!?]+$/, '');
}

function deriveAgentCounters(tickets) {
  const counts = Object.fromEntries(AGENT_COUNTERS.map((agent) => [agent, 0]));
  for (const ticket of tickets) {
    for (const artefact of ticket.artefacts) {
      if (artefact.exists && artefact.agent) counts[artefact.agent] += 1;
    }
    counts['QUIP Scoring'] += ticket.quipScores.length;
    const coePass2InTags = ticket.tags.some((tag) => tag.toLowerCase() === 'coe-pass-2-complete');
    const coePass2InJournal = ticket.journal.some((entry) => /coe[_-]pass2/i.test(entry.type));
    if (coePass2InTags || coePass2InJournal) counts['CoE Pass 2'] += 1;
  }
  return AGENT_COUNTERS.map((agent) => ({ agent, count: counts[agent] || 0 }));
}

function buildDashboardModel() {
  const tickets = buildTicketModel();
  const counts = {
    awaitingMe: tickets.filter((ticket) => ticket.category === 'awaiting-me').length,
    awaitingOthers: tickets.filter((ticket) => ticket.category === 'awaiting-others').length,
    inProgress: tickets.filter((ticket) => ticket.category === 'in-progress').length,
    closed: tickets.filter((ticket) => ticket.category === 'closed').length,
  };
  return {
    generatedAt: new Date().toISOString(),
    counts,
    stageCounts: ROADMAP_STATUSES.map((status) => ({
      status,
      count: tickets.filter((ticket) => ticket.roadmapStatus === status && ticket.category !== 'closed').length,
    })),
    agentRuns: deriveAgentCounters(tickets),
    tickets,
  };
}

function categoryLabel(category) {
  return {
    'awaiting-me': 'Awaiting me',
    'awaiting-others': 'Awaiting others',
    'in-progress': 'In progress',
    closed: 'Closed',
  }[category] || category;
}

function categoryClass(category) {
  return {
    'awaiting-me': 'tone-action',
    'awaiting-others': 'tone-wait',
    'in-progress': 'tone-work',
    closed: 'tone-closed',
  }[category] || 'tone-work';
}

function renderAgentCounters(model) {
  return model.agentRuns
    .map(
      (item) => `<article class="agent-counter">
        <p class="metric-label">${htmlEscape(item.agent)}</p>
        <strong>${item.count}</strong>
      </article>`
    )
    .join('');
}

function categoryFilter(category) {
  if (category === 'awaiting-me') return 'me';
  if (category === 'awaiting-others') return 'others';
  if (category === 'closed') return 'closed';
  return 'live';
}

function renderTicketRows(model) {
  const activeId = defaultTicketId(model);
  const initial = initialFilter(model);
  return model.tickets.map((ticket, index) => {
    const id = slugId(ticket.ticketFolder);
    const filter = categoryFilter(ticket.category);
    const tags = ticket.tags.length
      ? ticket.tags.slice(0, 4).map((tag) => `<span class="pill">${htmlEscape(tag)}</span>`).join('')
      : '<span class="pill">no local tags</span>';
    const visible = initial === 'live' ? filter !== 'closed' : filter === initial;
    return `<button class="ticket-row" type="button" data-ticket="${htmlEscape(id)}" data-filter="${filter}" aria-selected="${id === activeId ? 'true' : 'false'}"${visible ? '' : ' hidden'}>
      <span class="ticket-topline">
        <span class="ticket-title">${htmlEscape(ticket.title)}</span>
        <span class="pill" data-tone="${ticket.category === 'awaiting-me' ? 'navy' : 'blue'}">${htmlEscape(categoryLabel(ticket.category))}</span>
      </span>
      <span class="ticket-state">${htmlEscape(ticket.interpretedState)}</span>
      <span class="pill-row">
        <span class="pill">${htmlEscape(ticket.roadmapStatus || 'status unknown')}</span>
        <span class="pill">${htmlEscape(ticket.ticketId)}</span>
        ${tags}
      </span>
    </button>`;
  }).join('');
}

function renderDetailBodies(model) {
  const activeId = defaultTicketId(model);
  return model.tickets.map((ticket, index) => {
    const id = slugId(ticket.ticketFolder);
    const optionRows = ticket.decisionOptions.length
      ? ticket.decisionOptions.map((option) => `<span class="pill">${htmlEscape(option)}</span>`).join('')
      : '<span class="pill">No decision options in local source</span>';
    const prompt = ticket.recommendationPrompt || 'No open human gate prompt available in the local source files.';
    return `<article class="ticket-detail${id === activeId ? ' is-active' : ''}" data-detail="${htmlEscape(id)}">
      <div class="detail-topline">
        <div>
          <p class="eyebrow">${htmlEscape(ticket.ticketFolder)}</p>
          <h3 class="detail-title">${htmlEscape(ticket.title)}</h3>
        </div>
        <span class="pill" data-tone="${ticket.category === 'awaiting-me' ? 'navy' : 'blue'}">${htmlEscape(categoryLabel(ticket.category))}</span>
      </div>
      <p class="detail-summary">${htmlEscape(ticket.summary || ticket.product || 'No local summary found.')}</p>
      <div class="state-grid">
        <article class="state-card">
          <p class="table-label">ClickUp roadmap status</p>
          <strong>${htmlEscape(ticket.roadmapStatus || 'Unknown')}</strong>
          <p>Source fact from local ticket index or latest run manifest.</p>
        </article>
        <article class="state-card">
          <p class="table-label">Quorum interpretation</p>
          <strong>${htmlEscape(ticket.interpretedState)}</strong>
          <p>${htmlEscape(ticket.nextStep)}</p>
        </article>
        <article class="state-card">
          <p class="table-label">Human gate</p>
          <strong>${htmlEscape(ticket.currentGate || 'No gate open')}</strong>
          <p>${htmlEscape(ticket.gateType || 'No gate type found')}</p>
        </article>
        <article class="state-card prompt-card">
          <p class="table-label">Decision options</p>
          <div class="pill-row">${optionRows}</div>
        </article>
      </div>
      <article class="state-card prompt-card">
        <p class="table-label">Copy prompt</p>
        <p>${htmlEscape(prompt)}</p>
        <div class="copy-row">
          <span class="meta">Read-only handoff to Claude Code</span>
          <button class="copy-button" type="button" data-copy="${attrEscape(prompt)}">Copy prompt</button>
        </div>
      </article>
      <div class="accordion">
        ${renderAccordionItem('Artefacts', `${ticket.artefacts.filter((a) => a.exists).length} files`, renderArtefactRows(ticket), true)}
        ${renderAccordionItem('Context journal', `${ticket.journal.length} entries`, renderJournalRows(ticket), false)}
        ${renderAccordionItem('QUIP score', ticket.quip ? `v${ticket.quip.version}` : 'none', renderQuipRows(ticket), false)}
        ${renderAccordionItem('Source state', 'read order', renderSourceRows(ticket), false)}
      </div>
    </article>`;
  }).join('');
}

function defaultTicketId(model) {
  const ticket = model.tickets.find((item) => item.category === 'awaiting-me') ||
    model.tickets.find((item) => item.category !== 'closed') ||
    model.tickets[0];
  return ticket ? slugId(ticket.ticketFolder) : '';
}

function initialFilter(model) {
  return model.counts.awaitingMe > 0 ? 'me' : 'live';
}

function renderAccordionItem(title, count, body, open) {
  return `<section class="accordion-item${open ? ' is-open' : ''}">
    <button class="accordion-trigger" type="button">
      <span>${htmlEscape(title)}</span>
      <span>${htmlEscape(count)}</span>
    </button>
    <div class="accordion-panel"><div class="accordion-panel-inner">${body}</div></div>
  </section>`;
}

function renderArtefactRows(ticket) {
  const produced = ticket.artefacts.filter((artefact) => artefact.exists);
  if (!produced.length) return '<p class="empty-state is-visible">No run artefacts found.</p>';
  return produced
    .map(
      (artefact) => `<a class="artifact-row" href="${htmlEscape(artefact.href)}" target="_blank" rel="noopener">
        <span class="table-label">${htmlEscape(artefact.runSlug)}</span>
        <span><strong>${htmlEscape(artefact.fileName)}</strong><p>${htmlEscape(artefact.label)}</p></span>
      </a>`
    )
    .join('');
}

function renderJournalRows(ticket) {
  if (!ticket.journal.length) return '<p class="empty-state is-visible">No context journal found.</p>';
  return ticket.journal
    .map(
      (entry) => `<div class="timeline-row">
        <span class="table-label">${htmlEscape(entry.date || 'No date')}</span>
        <span><strong>${htmlEscape(entry.type || 'journal entry')}</strong><p>${htmlEscape(entry.summary)}</p><a href="${htmlEscape(entry.href)}" target="_blank" rel="noopener">Open source</a></span>
      </div>`
    )
    .join('');
}

function renderQuipRows(ticket) {
  if (!ticket.quipScores.length) return '<p class="empty-state is-visible">No QUIP scores found.</p>';
  return ticket.quipScores
    .map(
      (score) => `<a class="artifact-row" href="${htmlEscape(score.href)}" target="_blank" rel="noopener">
        <span class="table-label">v${score.version}</span>
        <span><strong>${htmlEscape(score.fileName)}</strong><p>${htmlEscape(score.status)}${score.totalScore ? ` - ${htmlEscape(score.totalScore)}` : ''}${score.hasOpenQuestions ? ' - open questions' : ''}</p></span>
      </a>`
    )
    .join('');
}

function renderSourceRows(ticket) {
  return ticket.sourceState.readOrder
    .map(
      (item, index) => `<div class="source-row">
        <span class="source-pill">${index + 1}</span>
        <span><strong>${htmlEscape(item)}</strong><p>${htmlEscape(sourceValue(ticket, item))}</p></span>
      </div>`
    )
    .join('');
}

function sourceValue(ticket, key) {
  if (key === 'status') return ticket.roadmapStatus || 'No local status found';
  if (key === 'closed') return ticket.tags.includes('closed') ? 'closed tag present' : 'closed tag absent';
  if (key === 'human-review-required') return ticket.pendingGate ? 'open gate found in local decisions' : 'no open gate found';
  if (key === 'progress-tags') return ticket.tags.filter((tag) => /complete|added|bau-cr/i.test(tag)).join(', ') || 'No progress tags found';
  if (key === 'state-tags') return ticket.tags.filter((tag) => /awaiting|stalled|duplicate|signal/i.test(tag)).join(', ') || 'No state tags found';
  return ticket.sourceState.lastComment || 'No last comment in local markdown';
}

function renderPage(model) {
  const initial = initialFilter(model);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quorum Dashboard</title>
<style>
  :root {
    --bg: #ffffff;
    --surface: #fafafa;
    --fg: #05053b;
    --muted: #82829e;
    --border: #e5e7ec;
    --accent: #05053b;
    --accent-secondary: #4c7eff;
    --font-display: "Monte Stella", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    --font-body: "Nexa", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; }
  html {
    min-height: 100%;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }
  body {
    min-height: 100vh;
    margin: 0;
    background: var(--bg);
  }
  button, input { font: inherit; }
  button { color: inherit; }
  h1, h2, h3, p { margin: 0; }
  a { color: inherit; }
  a:hover { text-decoration: underline; }
  .app-shell {
    width: min(1480px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 24px 0 40px;
  }
  .topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    align-items: end;
    padding: 20px 0 24px;
    border-bottom: 3px solid var(--accent-secondary);
  }
  .product-mark,
  .eyebrow,
  .metric-label,
  .pill,
  .tab-button,
  .meta,
  .table-label,
  .accordion-trigger,
  .source-pill {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.4;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .product-mark {
    display: inline-flex;
    min-height: 34px;
    margin-bottom: 20px;
    align-items: center;
    border: 1px solid var(--fg);
    border-radius: 8px;
    background: var(--fg);
    padding: 0 12px;
    color: var(--bg);
  }
  .eyebrow,
  .metric-label,
  .meta,
  .table-label { color: var(--muted); }
  h1 {
    max-width: 1280px;
    font-family: var(--font-display);
    font-size: clamp(42px, 5vw, 72px);
    line-height: 1;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .subtitle {
    max-width: 92ch;
    margin-top: 18px;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.55;
  }
  .dashboard {
    display: grid;
    gap: 16px;
    padding-top: 16px;
  }
  .metric-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .metric-card {
    min-height: 112px;
    padding: 18px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg);
    display: grid;
    align-content: space-between;
    gap: 18px;
  }
  .metric-card[data-priority="true"] {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }
  .metric-card[data-priority="true"] .metric-label,
  .metric-card[data-priority="true"] .metric-note { color: var(--border); }
  .metric-value {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--font-display);
    font-size: 42px;
    line-height: 0.95;
    letter-spacing: -0.03em;
  }
  .metric-note {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.35;
  }
  .agent-strip {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg);
    padding: 10px;
  }
  .agent-counter {
    min-height: 74px;
    display: grid;
    align-content: space-between;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 12px;
  }
  .agent-counter strong {
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .workspace {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }
  .panel {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg);
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: start;
    padding: 20px;
    border-bottom: 3px solid var(--accent-secondary);
    background: var(--bg);
  }
  .panel-head h2 {
    margin-top: 5px;
    font-family: var(--font-display);
    font-size: 28px;
    line-height: 1.08;
    letter-spacing: -0.02em;
  }
  .panel-head p {
    max-width: 58ch;
    margin-top: 7px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.45;
  }
  .queue-controls {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .tab-button {
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    cursor: pointer;
    transition: border-color 180ms cubic-bezier(0.23, 1, 0.32, 1), transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .tab-button[aria-pressed="true"] {
    border-color: var(--fg);
    transform: translateY(-1px);
  }
  .search {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
  }
  .search span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: var(--bg);
    color: var(--fg);
    font-size: 15px;
  }
  .ticket-list { display: grid; }
  .ticket-row {
    width: 100%;
    display: grid;
    gap: 11px;
    text-align: left;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    padding: 18px 20px;
    cursor: pointer;
  }
  .ticket-row:last-child { border-bottom: 0; }
  .ticket-row[hidden] { display: none; }
  .ticket-row[aria-selected="true"] {
    margin-left: 10px;
    width: calc(100% - 10px);
    border-left: 3px solid var(--fg);
    background: var(--surface);
    transition: margin-left 200ms cubic-bezier(0.23, 1, 0.32, 1), background 200ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ticket-topline,
  .detail-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
  .ticket-title {
    max-width: 54ch;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }
  .ticket-state {
    color: var(--fg);
    font-size: 14px;
    line-height: 1.45;
  }
  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .pill,
  .source-pill {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 5px 8px;
    color: var(--fg);
  }
  .pill[data-tone="navy"] {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }
  .pill[data-tone="blue"] {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }
  .detail-panel {
    position: sticky;
    top: 16px;
    border-color: var(--fg);
    border-width: 2px;
  }
  .detail-body {
    display: grid;
    gap: 18px;
    padding: 20px;
  }
  .ticket-detail { display: none; }
  .ticket-detail.is-active { display: grid; gap: 18px; }
  .detail-title {
    margin-top: 8px;
    font-family: var(--font-display);
    font-size: 36px;
    line-height: 1.04;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .detail-summary {
    max-width: 68ch;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.55;
  }
  .state-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .state-card {
    min-height: 118px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 14px;
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .state-card strong {
    font-size: 17px;
    line-height: 1.25;
  }
  .state-card p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
  .prompt-card { cursor: copy; }
  .copy-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
  }
  .copy-button {
    min-height: 34px;
    border: 1px solid var(--fg);
    border-radius: 8px;
    background: var(--fg);
    color: var(--bg);
    padding: 0 10px;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .accordion {
    display: grid;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .accordion-item + .accordion-item { border-top: 1px solid var(--border); }
  .accordion-trigger {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    min-height: 48px;
    border: 0;
    background: var(--bg);
    padding: 0 14px;
    cursor: pointer;
    text-align: left;
  }
  .accordion-trigger span:last-child { color: var(--muted); }
  .accordion-panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 180ms cubic-bezier(0.23, 1, 0.32, 1);
    background: var(--bg);
  }
  .accordion-panel-inner {
    min-height: 0;
    overflow: hidden;
    display: grid;
    gap: 8px;
    padding: 0 14px;
  }
  .accordion-item.is-open .accordion-panel { grid-template-rows: 1fr; }
  .accordion-item.is-open .accordion-panel-inner { padding-bottom: 14px; }
  .artifact-row,
  .timeline-row,
  .source-row {
    display: grid;
    grid-template-columns: 128px minmax(0, 1fr);
    gap: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 10px;
  }
  .artifact-row {
    color: inherit;
    text-decoration: none;
  }
  .artifact-row:hover strong {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
  .artifact-row strong,
  .timeline-row strong,
  .source-row strong {
    font-size: 14px;
    line-height: 1.35;
  }
  .artifact-row p,
  .timeline-row p,
  .source-row p {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.4;
  }
  .empty-state {
    display: none;
    padding: 30px 20px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }
  .empty-state.is-visible { display: block; }
  footer {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
    padding-top: 4px;
  }
  @media (max-width: 1180px) {
    .topbar,
    .workspace { grid-template-columns: minmax(0, 1fr); }
    .detail-panel { position: static; }
  }
  @media (max-width: 900px) {
    .metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .agent-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) {
    .app-shell { width: min(100% - 20px, 1480px); padding-top: 14px; }
    .metric-strip,
    .agent-strip,
    .tabs,
    .state-grid,
    .artifact-row,
    .timeline-row,
    .source-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<main class="app-shell" data-od-id="quorum-dashboard">
  <header class="topbar" data-od-id="dashboard-header">
    <div>
      <div class="product-mark" aria-label="Quorum dashboard">Quorum dashboard</div>
      <h1 data-od-id="dashboard-title">A focused inbox for product decisions within the CoE</h1>
      <p class="subtitle" data-od-id="dashboard-subtitle">Highlights what tickets need attention by the product team, which are awaiting other people, and provides stats on agent usage.</p>
    </div>
  </header>
  <section class="dashboard" aria-label="Quorum dashboard">
    <section class="metric-strip" data-od-id="metric-strip" aria-label="Operational counts">
      <article class="metric-card" data-priority="true">
        <p class="metric-label">Awaiting me</p>
        <div class="metric-value">${model.counts.awaitingMe}</div>
        <p class="metric-note">Open gates from local human decision logs.</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Awaiting others</p>
        <div class="metric-value">${model.counts.awaitingOthers}</div>
        <p class="metric-note">Tickets with awaiting-info or stalled state.</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">In progress</p>
        <div class="metric-value">${model.counts.inProgress}</div>
        <p class="metric-note">Agent work or routing without input needed.</p>
      </article>
      <article class="metric-card">
        <p class="metric-label">Closed</p>
        <div class="metric-value">${model.counts.closed}</div>
        <p class="metric-note">Visible, but excluded from live action counts.</p>
      </article>
    </section>
    <section class="agent-strip" data-od-id="agent-run-counters" aria-label="Agent run counters">
      ${renderAgentCounters(model)}
    </section>
    <section class="workspace" data-od-id="main-workspace">
      <section class="panel" data-od-id="ticket-queue">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Ticket queue</p>
            <h2>One list, filtered by action.</h2>
            <p>Tabs separate decisions, submitter follow-up, live work, and closed items without splitting the page into competing reports.</p>
          </div>
          <span class="pill" data-tone="navy" id="queueCount">0 shown</span>
        </div>
        <div class="queue-controls">
          <div class="tabs" role="group" aria-label="Queue filters">
            <button class="tab-button" type="button" data-filter-tab="me" aria-pressed="${initial === 'me' ? 'true' : 'false'}">Awaiting me</button>
            <button class="tab-button" type="button" data-filter-tab="others" aria-pressed="false">Awaiting others</button>
            <button class="tab-button" type="button" data-filter-tab="live" aria-pressed="${initial === 'live' ? 'true' : 'false'}">All live</button>
            <button class="tab-button" type="button" data-filter-tab="closed" aria-pressed="false">Closed</button>
          </div>
          <label class="search">
            <span>Search</span>
            <input id="searchInput" type="search" placeholder="Ticket, gate, tag, artefact..." autocomplete="off">
          </label>
        </div>
        <div class="ticket-list" id="ticketList">${renderTicketRows(model)}</div>
        <div class="empty-state" id="emptyState">No tickets match the current filter.</div>
      </section>
      <aside class="panel detail-panel" data-od-id="ticket-detail-panel" aria-label="Ticket detail">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Ticket detail</p>
            <h2>State first, source depth second.</h2>
            <p>The first view answers what it is, where it is, and what happens next. Markdown source detail is tucked behind accordions.</p>
          </div>
        </div>
        <div class="detail-body" id="detailBody">${renderDetailBodies(model)}</div>
      </aside>
    </section>
    <footer>Generated ${htmlEscape(model.generatedAt)}. Refresh manually with <code>node dashboard/generate_dashboard.cjs</code>.</footer>
  </section>
</main>
<script>
(function () {
  var activeFilter = '${initial}';
  var searchInput = document.getElementById('searchInput');
  var emptyState = document.getElementById('emptyState');
  var queueCount = document.getElementById('queueCount');

  function selectTicket(id) {
    document.querySelectorAll('.ticket-row').forEach(function (row) {
      row.setAttribute('aria-selected', row.getAttribute('data-ticket') === id ? 'true' : 'false');
    });
    document.querySelectorAll('.ticket-detail').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-detail') === id);
    });
  }

  function applyFilter() {
    var term = (searchInput.value || '').trim().toLowerCase();
    var shown = [];
    document.querySelectorAll('.ticket-row').forEach(function (row) {
      var filter = row.getAttribute('data-filter');
      var filterMatch = activeFilter === 'live' ? filter !== 'closed' : filter === activeFilter;
      var searchMatch = !term || row.textContent.toLowerCase().indexOf(term) !== -1;
      var visible = filterMatch && searchMatch;
      row.hidden = !visible;
      if (visible) shown.push(row);
    });
    emptyState.classList.toggle('is-visible', shown.length === 0);
    queueCount.textContent = shown.length + (shown.length === 1 ? ' shown' : ' shown');
    if (shown.length && !shown.some(function (row) { return row.getAttribute('aria-selected') === 'true'; })) {
      selectTicket(shown[0].getAttribute('data-ticket'));
    }
  }

  document.querySelectorAll('[data-filter-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      activeFilter = button.getAttribute('data-filter-tab');
      document.querySelectorAll('[data-filter-tab]').forEach(function (other) {
        other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
      applyFilter();
    });
  });

  document.querySelectorAll('.ticket-row').forEach(function (row) {
    row.addEventListener('click', function () {
      selectTicket(row.getAttribute('data-ticket'));
    });
  });

  document.querySelectorAll('.accordion-trigger').forEach(function (button) {
    button.addEventListener('click', function () {
      button.closest('.accordion-item').classList.toggle('is-open');
    });
  });

  document.querySelectorAll('.copy-button').forEach(function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy') || '';
      function done() {
        var previous = button.textContent;
        button.textContent = 'Copied';
        setTimeout(function () { button.textContent = previous; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  });

  searchInput.addEventListener('input', applyFilter);

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(area);
  }

  var first = document.querySelector('.ticket-row');
  if (first) selectTicket(first.getAttribute('data-ticket'));
  applyFilter();
})();
</script>
</body>
</html>`;
}

function buildDashboardHtml() {
  const model = buildDashboardModel();
  const html = renderPage(model);
  const stats = {
    tickets: model.tickets.length,
    awaitingMe: model.counts.awaitingMe,
    awaitingOthers: model.counts.awaitingOthers,
    inProgress: model.counts.inProgress,
    closed: model.counts.closed,
  };
  return { html, stats, model };
}

function main() {
  const { html, stats } = buildDashboardHtml();
  fs.mkdirSync(SCRIPT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log('Quorum dashboard generated.');
  console.log(`  Tickets scanned:      ${stats.tickets}`);
  console.log(`  Awaiting me:          ${stats.awaitingMe}`);
  console.log(`  Awaiting others:      ${stats.awaitingOthers}`);
  console.log(`  In progress:          ${stats.inProgress}`);
  console.log(`  Closed:               ${stats.closed}`);
  console.log(`  Output:               ${OUT_FILE}`);
}

if (require.main === module) main();

module.exports = {
  buildDashboardHtml,
  buildDashboardModel,
  TICKETS_DIR,
  OUT_FILE,
  ROOT,
  SCRIPT_DIR,
};
