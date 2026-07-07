#!/usr/bin/env node
/*
 * Quorum Dashboard Generator
 * --------------------------
 * Scans quorum-runs/ and quorum-context/, parses the markdown state files,
 * and writes a single self-contained (no external deps, inline CSS/JS) HTML
 * dashboard to dashboard/quorum_dashboard.html.
 *
 * READ-ONLY: this script and the HTML it produces only DISPLAY state. Nothing
 * here writes back to any run/context file, ClickUp, or Supabase. Gate
 * approvals happen through Claude Code (the Orchestrator), never the browser.
 *
 * Re-runnable: overwrites quorum_dashboard.html cleanly on every run.
 *
 * Usage:  node dashboard/generate_dashboard.cjs
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const RUNS_DIR = path.join(ROOT, 'quorum-runs');
const CONTEXT_DIR = path.join(ROOT, 'quorum-context');
const OUT_FILE = path.join(SCRIPT_DIR, 'quorum_dashboard.html');

// Canonical Quorum run-folder artefacts, keyed by their numeric prefix.
const ARTEFACTS = [
  { num: '00', label: 'Run manifest' },
  { num: '01', label: 'Ticket intake' },
  { num: '02', label: 'Context pack' },
  { num: '03', label: 'Persona recommendation' },
  { num: '04', label: 'Clarification questions' },
  { num: '05', label: 'Requirements' },
  { num: '06', label: 'Solution design' },
  { num: '07', label: 'Test plan' },
  { num: '08', label: 'Human decisions' },
  { num: '09', label: 'Implementation handoff' },
  { num: '10', label: 'ClickUp summary' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function listDirs(p) {
  try {
    return fs
      .readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function listFiles(p) {
  try {
    return fs
      .readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function htmlEscape(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Split a markdown body into sections keyed by heading text at a given level
// (2 = "## ", 3 = "### "). Returns [{ heading, lines[] }] in document order,
// plus any preamble before the first heading as heading = null.
function splitByHeading(text, level) {
  const marker = '#'.repeat(level) + ' ';
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of lines) {
    // A heading of exactly this level (not deeper) starts a new section.
    const isThisLevel =
      line.startsWith(marker) && !line.startsWith('#'.repeat(level + 1) + ' ');
    if (isThisLevel) {
      sections.push(current);
      current = { heading: line.slice(marker.length).trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections;
}

// First non-empty line of a block.
function firstValue(lines) {
  for (const l of lines) {
    const t = l.trim();
    if (t) return t;
  }
  return '';
}

// Parse "- Key: value" or "Key: value" bullet lines into an object.
function parseKeyValues(lines) {
  const out = {};
  for (const raw of lines) {
    const l = raw.replace(/^\s*[-*]\s+/, '').trim();
    const m = l.match(/^([A-Za-z0-9 /]+):\s*(.*)$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

// Parse a numbered list ("1. text") from a set of lines.
function parseNumberedList(lines) {
  const items = [];
  for (const raw of lines) {
    const m = raw.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (m) items.push({ n: Number(m[1]), text: m[2].trim() });
  }
  return items;
}

function isTBC(v) {
  return !v || /\[TBC/i.test(v) || /^TBC/i.test(v);
}

// ---------------------------------------------------------------------------
// Manifest parsing (00_run_manifest.md)
// ---------------------------------------------------------------------------

function parseManifest(text) {
  const out = {
    runId: '',
    ticketId: '',
    ticketUrl: '',
    clickupStatus: '',
    tags: '',
    objective: '',
    currentStatus: '',
    currentStage: '',
    currentGate: '',
    createdAt: '',
    triggeredBy: '',
    outputFiles: [], // [{ name, state }]
    decisions: [], // [{ id, title, status, decision, recommendation, options[] }]
    supabaseRunId: '',
  };
  if (!text) return out;

  const sections = splitByHeading(text, 2);
  for (const sec of sections) {
    const h = (sec.heading || '').toLowerCase();
    if (h === 'run id') out.runId = firstValue(sec.lines);
    else if (h === 'source ticket') {
      const kv = parseKeyValues(sec.lines);
      out.ticketId = kv['ticket id'] || '';
      out.ticketUrl = kv['ticket url'] || '';
      out.clickupStatus = kv['live clickup status'] || '';
      out.tags = kv['active tags'] || '';
    } else if (h === 'objective') out.objective = firstValue(sec.lines);
    else if (h === 'current status') out.currentStatus = firstValue(sec.lines);
    else if (h === 'current stage') out.currentStage = firstValue(sec.lines);
    else if (h === 'current gate') out.currentGate = firstValue(sec.lines);
    else if (h === 'created at') out.createdAt = firstValue(sec.lines);
    else if (h === 'triggered by') out.triggeredBy = firstValue(sec.lines);
    else if (h === 'output files') {
      for (const raw of sec.lines) {
        const l = raw.replace(/^\s*[-*]\s+/, '').trim();
        if (!l) continue;
        // "01_ticket_intake.md - current" / " - not produced yet"
        const m = l.match(/^(\S+\.md)\s*-\s*(.*)$/);
        if (m) out.outputFiles.push({ name: m[1], state: m[2].trim() });
        else out.outputFiles.push({ name: l, state: '' });
      }
    } else if (h === 'human decisions') {
      out.decisions = parseManifestDecisions(sec.lines.join('\n'));
    } else if (h === 'links') {
      const kv = parseKeyValues(sec.lines);
      out.supabaseRunId = kv['supabase workflow_run_id'] || '';
      if (!out.ticketUrl && kv['ticket']) out.ticketUrl = kv['ticket'];
    }
  }
  return out;
}

// The "## Human Decisions" section contains "### D0x - title" sub-blocks.
function parseManifestDecisions(text) {
  const subs = splitByHeading(text, 3);
  const decisions = [];
  for (const sub of subs) {
    if (!sub.heading) continue;
    const idm = sub.heading.match(/^(D\d+)\b\s*[-–—]?\s*(.*)$/);
    const id = idm ? idm[1] : sub.heading;
    const title = idm ? idm[2].trim() : '';
    const dec = { id, title, status: '', decision: '', recommendation: '', options: [] };
    // Options list sits after an "Options:" marker; capture everything from there.
    let optStart = -1;
    for (let i = 0; i < sub.lines.length; i++) {
      const l = sub.lines[i].trim();
      if (/^options:?\s*$/i.test(l)) { optStart = i + 1; break; }
    }
    const headLines = optStart >= 0 ? sub.lines.slice(0, optStart) : sub.lines;
    for (const raw of headLines) {
      const l = raw.trim();
      let m;
      if ((m = l.match(/^status:\s*(.*)$/i))) dec.status = m[1].trim();
      else if ((m = l.match(/^decision:\s*(.*)$/i))) dec.decision = m[1].trim();
      else if ((m = l.match(/^recommendation:\s*(.*)$/i))) dec.recommendation = m[1].trim();
    }
    if (optStart >= 0) dec.options = parseNumberedList(sub.lines.slice(optStart));
    decisions.push(dec);
  }
  return decisions;
}

// ---------------------------------------------------------------------------
// Human decision log parsing (08_human_decisions.md)
// ---------------------------------------------------------------------------

function parseHumanDecisions(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  // Find decision boundaries: "## D0x - title"
  const decisions = [];
  let cur = null;
  const flush = () => { if (cur) decisions.push(cur); };
  for (const line of lines) {
    const dm = line.match(/^##\s+(D\d+)\b\s*[-–—]?\s*(.*)$/);
    if (dm) {
      flush();
      cur = { id: dm[1], title: dm[2].trim(), sub: [], _cur: null };
      continue;
    }
    if (!cur) continue;
    // Sub-sections within a decision are "## X" headings too.
    const sm = line.match(/^##\s+(.*)$/);
    if (sm) {
      cur._cur = { heading: sm[1].trim(), lines: [] };
      cur.sub.push(cur._cur);
      continue;
    }
    if (cur._cur) cur._cur.lines.push(line);
    else {
      // frontmatter bullets before first sub-heading
      if (!cur._front) cur._front = [];
      cur._front.push(line);
    }
  }
  flush();

  // Normalise into a friendly shape.
  return decisions.map((d) => {
    const front = parseKeyValues(d._front || []);
    const get = (name) => {
      const s = d.sub.find((x) => x.heading.toLowerCase() === name);
      return s ? s.lines : null;
    };
    const optionsLines = get('options presented');
    const auditLines = get('audit event');
    return {
      id: d.id,
      title: d.title,
      type: front['type'] || '',
      status: (front['status'] || '').toLowerCase(),
      requestedAt: front['requested at'] || '',
      resolvedAt: front['resolved at'] || '',
      decidedBy: front['decided by'] || '',
      rationale: joinText(get('rationale')),
      options: optionsLines ? parseNumberedList(optionsLines) : [],
      humanResponse: joinText(get('human response')),
      recordedDecision: joinText(get('recorded decision')),
      recordedAction: joinText(get('recorded action')),
      auditDecision: auditLines ? (parseKeyValues(auditLines)['decision'] || '') : '',
    };
  });
}

function joinText(lines) {
  if (!lines) return '';
  return lines.map((l) => l.trim()).filter(Boolean).join(' ').trim();
}

// ---------------------------------------------------------------------------
// Context journal parsing (quorum-context/{id}.md)
// ---------------------------------------------------------------------------

function parseJournal(text) {
  const out = { note: '', entries: [] };
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  let cur = null;
  const flush = () => {
    if (cur) {
      cur.summary = cur.bodyLines
        .filter((l) => !/^→\s*Full detail:/i.test(l.trim()))
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ');
      const link = cur.bodyLines.find((l) => /^→\s*Full detail:/i.test(l.trim()));
      if (link) {
        const m = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
        cur.detailLabel = m ? m[1] : '';
        cur.detailHref = m ? m[2] : '';
      }
      delete cur.bodyLines;
      out.entries.push(cur);
    }
  };
  for (const line of lines) {
    const hm = line.match(/^###\s+(.*)$/);
    if (hm) {
      flush();
      const header = hm[1].trim();
      // Split "DATE — EVENT" on a spaced dash (dates use bare hyphens, so safe).
      const parts = header.split(/\s+[—–-]\s+/);
      cur = {
        date: parts[0] ? parts[0].trim() : header,
        event: parts.length > 1 ? parts.slice(1).join(' — ').trim() : '',
        bodyLines: [],
        summary: '',
        detailLabel: '',
        detailHref: '',
      };
      continue;
    }
    if (cur) cur.bodyLines.push(line);
    else if (/note:/i.test(line) && !out.note) out.note = line.trim();
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// Assemble run models
// ---------------------------------------------------------------------------

function fileNumPrefix(name) {
  const m = name.match(/^(\d{2})_/);
  return m ? m[1] : null;
}

// Parse the latest QUIP_score_v{n}.md in a run folder. QUIP scores are a
// non-standard lifecycle artefact (see QUORUM.md); this reads the machine-
// readable Score Status line and counts open clarification questions under the
// `<!-- quip:open-questions -->` marker so the run card can flag a provisional
// score. Returns null when the run has no QUIP score.
function parseQuip(dir, files) {
  let file = null;
  let version = -1;
  for (const f of files) {
    const m = f.match(/^QUIP_score_v(\d+)\.md$/i);
    if (m && Number(m[1]) > version) {
      version = Number(m[1]);
      file = f;
    }
  }
  if (!file) return null;

  const text = readFileSafe(path.join(dir, file));
  if (!text) return null;

  const statusM = text.match(/\*\*Score Status:\*\*\s*([a-z-]+)/i);
  const status = statusM ? statusM[1].trim().toLowerCase() : 'unknown';
  const scoreM = text.match(/^Total Score:\s*([\d.]+)\s*$/m);
  const totalScore = scoreM ? scoreM[1] : null;
  const trigM = text.match(/\*\*Trigger:\*\*\s*(\w+)/i);
  const trigger = trigM ? trigM[1].trim().toLowerCase() : null;

  // Count open questions: `-` bullets after the marker, until the next `##`
  // heading. A leading "None" line means zero.
  let openCount = 0;
  const MARK = '<!-- quip:open-questions -->';
  const mk = text.indexOf(MARK);
  if (mk !== -1) {
    for (const raw of text.slice(mk + MARK.length).split(/\r?\n/)) {
      const t = raw.trim();
      if (t.startsWith('##')) break;
      if (/^none\b/i.test(t)) { openCount = 0; break; }
      if (t.startsWith('- ')) openCount++;
    }
  }

  return { file, version, status, totalScore, trigger, openCount };
}

function buildRun(slug) {
  const dir = path.join(RUNS_DIR, slug);
  const files = listFiles(dir);
  const fileByNum = {};
  for (const f of files) {
    const n = fileNumPrefix(f);
    if (n && !fileByNum[n]) fileByNum[n] = f;
  }
  const presentNums = new Set(Object.keys(fileByNum));

  const manifestText = readFileSafe(path.join(dir, '00_run_manifest.md'));
  const decisionsText = readFileSafe(path.join(dir, '08_human_decisions.md'));

  const manifest = parseManifest(manifestText);
  const decisions = parseHumanDecisions(decisionsText);

  // Recommendation text for each decision id, harvested from the manifest.
  const recByeId = {};
  for (const d of manifest.decisions) recByeId[d.id] = d.recommendation;

  const artefacts = ARTEFACTS.map((a) => ({
    ...a,
    present: presentNums.has(a.num),
    file: fileByNum[a.num] || null,
  }));

  // Pending gate: prefer the decision-log entry with status "pending",
  // else fall back to the manifest's Current Gate + its manifest options.
  let pending = decisions.find((d) => d.status === 'pending');
  let pendingOptions = pending ? pending.options : [];
  let pendingRec = pending ? recByeId[pending.id] || '' : '';
  let pendingTitle = pending ? `${pending.id} — ${pending.title}` : '';
  if (!pending && manifest.currentGate && !isTBC(manifest.currentGate)) {
    const md = manifest.decisions.find(
      (d) => manifest.currentGate.startsWith(d.id) || `${d.id} - ${d.title}` === manifest.currentGate
    );
    if (md && (md.status || '').toLowerCase() === 'pending') {
      pendingTitle = manifest.currentGate;
      pendingOptions = md.options;
      pendingRec = md.recommendation;
    }
  }

  return {
    slug,
    dir,
    manifest,
    decisions,
    artefacts,
    quip: parseQuip(dir, files),
    pending: pendingTitle
      ? { title: pendingTitle, options: pendingOptions, recommendation: pendingRec }
      : null,
  };
}

function matchJournalKeys(run) {
  const keys = [run.slug, run.manifest.runId].filter(Boolean);
  if (run.manifest.ticketId && !isTBC(run.manifest.ticketId)) keys.push(run.manifest.ticketId);
  return keys;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('await') || s.includes('pending') || s.includes('gate')) return 'st-await';
  if (s.includes('closed') || s.includes('reject') || s.includes('cancel')) return 'st-closed';
  if (s.includes('scheduled') || s.includes('complete') || s.includes('approved') || s.includes('resolved'))
    return 'st-done';
  return 'st-active';
}

function renderOptions(options) {
  if (!options || !options.length) return '';
  return `<ol class="options">${options
    .map((o) => `<li>${htmlEscape(o.text)}</li>`)
    .join('')}</ol>`;
}

function renderArtefacts(slug, artefacts) {
  return `<ul class="artefacts">${artefacts
    .map((a) => {
      // Present artefacts link to the local file via a relative path that works
      // both as a file:// static page and through the live server's read-only
      // file route. Opens in a new tab so the dashboard (and live view) stays put.
      const label =
        a.present && a.file
          ? `<a class="alabel alink" href="../quorum-runs/${encodeURIComponent(slug)}/${encodeURIComponent(
              a.file
            )}" target="_blank" rel="noopener">${htmlEscape(a.label)}</a>`
          : `<span class="alabel">${htmlEscape(a.label)}</span>`;
      return `<li class="${a.present ? 'yes' : 'no'}"><span class="tick">${
        a.present ? '&#10003;' : '&#9675;'
      }</span><span class="anum">${a.num}</span>${label}<span class="astate">${
        a.present ? 'produced' : 'not yet'
      }</span></li>`;
    })
    .join('')}</ul>`;
}

function renderDecision(d) {
  const cls = statusClass(d.status);
  const meta = [d.type, d.decidedBy && `by ${d.decidedBy}`, d.resolvedAt && !isTBC(d.resolvedAt) && `resolved ${d.resolvedAt}`]
    .filter(Boolean)
    .join(' · ');
  const body = [];
  if (d.rationale) body.push(`<div class="drow"><span class="dk">Rationale</span><span class="dv">${htmlEscape(d.rationale)}</span></div>`);
  if (d.options.length) body.push(`<div class="drow"><span class="dk">Options presented</span><span class="dv">${renderOptions(d.options)}</span></div>`);
  if (d.humanResponse && !isTBC(d.humanResponse)) body.push(`<div class="drow"><span class="dk">Human response</span><span class="dv">${htmlEscape(d.humanResponse)}</span></div>`);
  if (d.recordedDecision && !isTBC(d.recordedDecision)) body.push(`<div class="drow"><span class="dk">Recorded decision</span><span class="dv">${htmlEscape(d.recordedDecision)}</span></div>`);
  if (d.recordedAction && !isTBC(d.recordedAction)) body.push(`<div class="drow"><span class="dk">Recorded action</span><span class="dv">${htmlEscape(d.recordedAction)}</span></div>`);
  return `<div class="decision">
    <div class="dhead"><span class="pill ${cls}">${htmlEscape(d.status || 'unknown')}</span>
    <strong>${htmlEscape(d.id)}</strong> — ${htmlEscape(d.title)}${meta ? `<span class="dmeta">${htmlEscape(meta)}</span>` : ''}</div>
    ${body.join('')}
  </div>`;
}

function renderJournal(journal) {
  if (!journal || !journal.entries.length) {
    return `<p class="muted">No context journal found for this run.</p>`;
  }
  const rows = journal.entries
    .map(
      (e) => `<li>
        <div class="jhead"><span class="jdate">${htmlEscape(e.date)}</span><span class="jevent">${htmlEscape(
        e.event
      )}</span></div>
        <div class="jsummary">${htmlEscape(e.summary)}</div>
        ${
          e.detailHref
            ? `<div class="jlink">&#8594; Full detail: <a href="${htmlEscape(
                e.detailHref
              )}" target="_blank" rel="noopener"><code>${htmlEscape(e.detailLabel || e.detailHref)}</code></a></div>`
            : ''
        }
      </li>`
    )
    .join('');
  return `<ol class="journal">${rows}</ol>`;
}

function renderRun(run, journal, idx) {
  const m = run.manifest;
  const ticketId = isTBC(m.ticketId) ? 'TBC' : htmlEscape(m.ticketId);
  const status = m.currentStatus || '(unknown)';
  const producedCount = run.artefacts.filter((a) => a.present).length;

  return `<section class="run" id="run-${idx}">
    <header class="run-head">
      <div class="run-title">
        <h2>${htmlEscape(run.slug)}</h2>
        <div class="run-sub">
          <span class="pill ${statusClass(status)}">${htmlEscape(status)}</span>
          <span class="kv">Ticket: <strong>${ticketId}</strong></span>
          ${m.clickupStatus && !isTBC(m.clickupStatus) ? `<span class="kv">ClickUp: ${htmlEscape(m.clickupStatus)}</span>` : ''}
          ${m.currentStage ? `<span class="kv">Stage: ${htmlEscape(m.currentStage)}</span>` : ''}
          <span class="kv">${producedCount}/${run.artefacts.length} artefacts</span>
          ${run.quip ? `<span class="kv">QUIP v${run.quip.version}: <strong>${htmlEscape(run.quip.totalScore || '?')}</strong></span>` : ''}
        </div>
        ${m.objective ? `<p class="objective">${htmlEscape(m.objective)}</p>` : ''}
      </div>
    </header>

    ${
      run.quip && (run.quip.status.startsWith('provisional') || run.quip.openCount > 0)
        ? `<div class="quip-flag">
             <span class="quip-flag-label">&#9888; Provisional QUIP score</span>
             v${run.quip.version} recorded (status: <strong>${htmlEscape(run.quip.status)}</strong>)${
               run.quip.openCount
                 ? ` with <strong>${run.quip.openCount} open clarification question${run.quip.openCount === 1 ? '' : 's'}</strong>`
                 : ''
             }. Re-run manually with the missing figures to finalise. See <code>${htmlEscape(run.quip.file)}</code>.
           </div>`
        : ''
    }

    ${
      run.pending
        ? `<div class="gate">
             <div class="gate-label">&#9873; Pending gate</div>
             <div class="gate-title">${htmlEscape(run.pending.title)}</div>
             ${run.pending.recommendation ? `<div class="gate-rec"><span class="dk">Recommendation</span> ${htmlEscape(run.pending.recommendation)}</div>` : ''}
             ${renderOptions(run.pending.options)}
             <div class="gate-note">Decision is made through Claude Code (the Orchestrator), not this dashboard.</div>
           </div>`
        : `<div class="gate gate-none">No gate pending &mdash; nothing awaiting a decision on this run.</div>`
    }

    <div class="cols">
      <div class="col">
        <h3>Artefacts</h3>
        ${renderArtefacts(run.slug, run.artefacts)}
      </div>
      <div class="col">
        <h3>Decision history</h3>
        ${
          run.decisions.length
            ? run.decisions.map(renderDecision).join('')
            : '<p class="muted">No decisions recorded (08_human_decisions.md not found or empty).</p>'
        }
      </div>
    </div>

    <details class="journal-wrap">
      <summary>Context journal timeline${journal && journal.entries.length ? ` (${journal.entries.length})` : ''}</summary>
      ${journal && journal.note ? `<p class="muted">${htmlEscape(journal.note.replace(/^\**|\**$/g, ''))}</p>` : ''}
      ${renderJournal(journal)}
    </details>
  </section>`;
}

function renderOrphanJournal(name, journal, idx) {
  return `<section class="run orphan" id="orphan-${idx}">
    <header class="run-head">
      <div class="run-title">
        <h2>${htmlEscape(name)}</h2>
        <div class="run-sub"><span class="pill st-active">context journal only</span>
        <span class="kv">No matching run folder</span></div>
      </div>
    </header>
    <details class="journal-wrap" open>
      <summary>Context journal timeline${journal.entries.length ? ` (${journal.entries.length})` : ''}</summary>
      ${journal.note ? `<p class="muted">${htmlEscape(journal.note.replace(/^\**|\**$/g, ''))}</p>` : ''}
      ${renderJournal(journal)}
    </details>
  </section>`;
}

function renderPage(runs, orphanJournals, generatedAt) {
  const awaiting = runs.filter((r) => r.pending).length;
  const runCards = runs.map((r, i) => renderRun(r, r._journal, i)).join('\n');
  const orphanCards = orphanJournals.map((o, i) => renderOrphanJournal(o.name, o.journal, i)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quorum Dashboard</title>
<style>
  :root {
    --navy: #0a2540; --ink: #1a2b3c; --muted: #6b7a8d; --line: #e2e8f0;
    --bg: #f5f7fa; --card: #ffffff; --accent: #2b6cb0;
    --await-bg: #fff4e0; --await-fg: #9a5b00; --await-br: #f0c27a;
    --done-bg: #e6f4ea; --done-fg: #1e6b3a; --done-br: #a9d6ba;
    --active-bg: #e8f0fb; --active-fg: #24507f; --active-br: #b6cdec;
    --closed-bg: #fbe7e7; --closed-fg: #8b2b2b; --closed-br: #e2b0b0;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         color: var(--ink); background: var(--bg); line-height: 1.5; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 20px 64px; }
  header.page { border-bottom: 3px solid var(--navy); padding-bottom: 16px; margin-bottom: 24px; }
  header.page h1 { margin: 0 0 4px; color: var(--navy); font-size: 24px; letter-spacing: -0.01em; }
  .sub { color: var(--muted); font-size: 13px; }
  .summary-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px 16px; }
  .stat b { display: block; font-size: 22px; color: var(--navy); }
  .stat span { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .readonly { background: #eef2f7; border: 1px dashed #b6c4d6; color: #3d5872; border-radius: 8px;
              padding: 10px 14px; font-size: 13px; margin-top: 16px; }
  .run { background: var(--card); border: 1px solid var(--line); border-radius: 14px;
         padding: 20px 22px; margin-bottom: 22px; box-shadow: 0 1px 2px rgba(10,37,64,0.04); }
  .run.orphan { border-style: dashed; }
  .run-head { margin-bottom: 14px; }
  .run-title h2 { margin: 0; font-size: 17px; color: var(--navy); word-break: break-word; }
  .run-sub { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: center; margin-top: 8px; font-size: 13px; color: var(--muted); }
  .kv strong { color: var(--ink); }
  .objective { margin: 10px 0 0; font-size: 14px; color: var(--ink); }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;
          border: 1px solid transparent; text-transform: lowercase; }
  .st-await { background: var(--await-bg); color: var(--await-fg); border-color: var(--await-br); }
  .st-done { background: var(--done-bg); color: var(--done-fg); border-color: var(--done-br); }
  .st-active { background: var(--active-bg); color: var(--active-fg); border-color: var(--active-br); }
  .st-closed { background: var(--closed-bg); color: var(--closed-fg); border-color: var(--closed-br); }
  .gate { border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; border: 1px solid var(--await-br);
          background: var(--await-bg); }
  .gate-none { background: #f3f6f9; border-color: var(--line); color: var(--muted); }
  .gate-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--await-fg); }
  .gate-title { font-size: 15px; font-weight: 700; color: var(--navy); margin: 2px 0 8px; }
  .gate-rec { font-size: 13px; margin-bottom: 8px; }
  .gate-note { font-size: 12px; color: var(--await-fg); margin-top: 8px; font-style: italic; }
  .quip-flag { border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px;
               background: #fff4e5; border: 1px solid #f0c68a; color: #7a4b00; }
  .quip-flag-label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
                     font-size: 11px; display: block; margin-bottom: 2px; }
  .quip-flag code { background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  .options { margin: 6px 0 0; padding-left: 22px; }
  .options li { margin: 3px 0; font-size: 13px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
  .col h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);
            margin: 0 0 10px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
  .artefacts { list-style: none; margin: 0; padding: 0; }
  .artefacts li { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
  .artefacts .tick { width: 16px; text-align: center; }
  .artefacts li.yes .tick { color: #1e6b3a; }
  .artefacts li.no { color: var(--muted); }
  .artefacts li.no .tick { color: #b6c4d6; }
  .anum { font-variant-numeric: tabular-nums; color: var(--muted); width: 22px; }
  .alabel { flex: 1; }
  a.alabel.alink { color: var(--accent); text-decoration: none; }
  a.alabel.alink:hover { text-decoration: underline; }
  .jlink a { color: var(--accent); text-decoration: none; }
  .jlink a:hover { text-decoration: underline; }
  .astate { font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  .artefacts li.yes .astate { color: #1e6b3a; }
  .artefacts li.no .astate { color: #b6c4d6; }
  .decision { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .dhead { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; font-size: 14px; }
  .dmeta { color: var(--muted); font-size: 12px; }
  .drow { display: block; margin-top: 6px; font-size: 13px; }
  .dk { display: inline-block; font-weight: 700; color: var(--muted); font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.03em; margin-right: 6px; }
  .dv { color: var(--ink); }
  .drow .dv .options { display: inline-block; }
  .journal-wrap { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 8px; }
  .journal-wrap summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--accent); }
  .journal { margin: 12px 0 0; padding-left: 0; list-style: none; }
  .journal li { border-left: 2px solid var(--line); padding: 0 0 14px 16px; position: relative; }
  .journal li::before { content: ""; position: absolute; left: -5px; top: 4px; width: 8px; height: 8px;
                        background: var(--accent); border-radius: 50%; }
  .jhead { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .jdate { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .jevent { font-size: 13px; font-weight: 700; color: var(--navy); }
  .jsummary { font-size: 13px; margin-top: 2px; }
  .jlink { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .jlink code { background: #f0f3f7; padding: 1px 5px; border-radius: 4px; }
  .muted { color: var(--muted); font-size: 13px; }
  footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="page">
    <h1>Quorum Dashboard</h1>
    <div class="sub">Read-only view of run + context-journal state &middot; generated ${htmlEscape(generatedAt)}</div>
    <div class="summary-bar">
      <div class="stat"><b>${runs.length}</b><span>Runs</span></div>
      <div class="stat"><b>${awaiting}</b><span>Awaiting a gate</span></div>
      <div class="stat"><b>${orphanJournals.length}</b><span>Journals w/o run</span></div>
    </div>
    <div class="readonly"><strong>Read-only.</strong> This dashboard displays state only. It does not approve gates or write back to any file, ClickUp, or Supabase. Gate approvals happen through Claude Code (the Orchestrator) in session &mdash; never from the browser.</div>
  </header>

  ${runs.length ? runCards : '<p class="muted">No runs found under quorum-runs/.</p>'}
  ${orphanJournals.length ? `<h2 style="color:var(--navy);font-size:16px;margin:28px 0 12px;">Context journals without a run folder</h2>${orphanCards}` : ''}

  <footer>Generated by dashboard/generate_dashboard.cjs &middot; re-run to refresh.</footer>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Scan disk, parse everything, and return { html, stats }. This is the single
// source of truth for building the dashboard — the CLI (main) and the live
// server (serve_dashboard.cjs) both call it, so parsing/rendering never drift.
function buildDashboardHtml() {
  const slugs = listDirs(RUNS_DIR);
  const runs = slugs.map(buildRun);

  // Load journals and match to runs.
  const journalFiles = listFiles(CONTEXT_DIR).filter((f) => f.endsWith('.md'));
  const journals = {}; // basename (no .md) -> { name, journal, used }
  for (const f of journalFiles) {
    const name = f.replace(/\.md$/, '');
    journals[name] = {
      name,
      journal: parseJournal(readFileSafe(path.join(CONTEXT_DIR, f))),
      used: false,
    };
  }

  for (const run of runs) {
    run._journal = null;
    for (const key of matchJournalKeys(run)) {
      if (journals[key] && !journals[key].used) {
        run._journal = journals[key].journal;
        journals[key].used = true;
        break;
      }
    }
  }

  const orphanJournals = Object.values(journals)
    .filter((j) => !j.used)
    .map((j) => ({ name: j.name, journal: j.journal }));

  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const html = renderPage(runs, orphanJournals, generatedAt);
  const stats = {
    runs: runs.length,
    awaiting: runs.filter((r) => r.pending).length,
    orphans: orphanJournals.length,
  };
  return { html, stats };
}

function main() {
  const { html, stats } = buildDashboardHtml();
  fs.mkdirSync(SCRIPT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf8'); // overwrite cleanly each run

  console.log(`Quorum dashboard generated.`);
  console.log(`  Runs scanned:      ${stats.runs}`);
  console.log(`  Awaiting a gate:   ${stats.awaiting}`);
  console.log(`  Orphan journals:   ${stats.orphans}`);
  console.log(`  Output:            ${OUT_FILE}`);
}

if (require.main === module) main();

module.exports = { buildDashboardHtml, RUNS_DIR, CONTEXT_DIR, OUT_FILE, ROOT, SCRIPT_DIR };
