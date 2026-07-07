#!/usr/bin/env node
/*
 * Quorum Dashboard Generator
 * --------------------------
 * Scans quorum-tickets/, parses the markdown state files, and writes a single
 * self-contained read-only HTML dashboard to dashboard/quorum_dashboard.html.
 *
 * Usage: node dashboard/generate_dashboard.cjs
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const TICKETS_DIR = path.join(ROOT, 'quorum-tickets');
const OUT_FILE = path.join(SCRIPT_DIR, 'quorum_dashboard.html');

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

const STATUS_ORDER = [
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
      .map((d) => d.name)
      .sort();
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

function splitByHeading(text, level) {
  const marker = '#'.repeat(level) + ' ';
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of lines) {
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

function firstValue(lines) {
  for (const l of lines || []) {
    const t = l.trim();
    if (t) return t;
  }
  return '';
}

function parseKeyValues(lines) {
  const out = {};
  for (const raw of lines || []) {
    const l = raw
      .replace(/^\s*[-*]\s+/, '')
      .replace(/\*\*/g, '')
      .trim();
    const m = l.match(/^([A-Za-z0-9 /]+):\s*(.*)$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function parseNumberedList(lines) {
  const items = [];
  for (const raw of lines || []) {
    const m = raw.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (m) items.push({ n: Number(m[1]), text: m[2].trim() });
  }
  return items;
}

function isTBC(v) {
  return !v || /\[TBC/i.test(v) || /^TBC/i.test(v);
}

function cleanMdValue(v) {
  return (v || '').replace(/`/g, '').trim();
}

function splitTicketFolder(folder) {
  const [id, ...rest] = folder.split('__');
  return { id: id || '', slug: rest.join('__') || folder };
}

function parseTicketIndex(text) {
  const out = {
    title: '',
    clickupId: '',
    clickupUrl: '',
    product: '',
    liveStatus: '',
    currentStage: '',
    created: '',
    runsText: '',
    latestScoreText: '',
    whatItIs: '',
  };
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  const title = lines.find((l) => /^#\s+/.test(l));
  out.title = title ? title.replace(/^#\s+/, '').trim() : '';
  const kv = parseKeyValues(lines);
  out.clickupId = kv['clickup id'] || '';
  out.clickupUrl = kv['clickup url'] || '';
  out.product = kv.product || '';
  out.liveStatus = kv['live clickup status'] || '';
  out.currentStage = kv['current pdlc stage'] || '';
  out.created = kv.created || '';
  out.runsText = kv.runs || '';
  out.latestScoreText = kv['latest quip score'] || '';
  out.whatItIs = out.product ? `${out.product}${out.currentStage ? ` ticket at ${out.currentStage}` : ''}.` : '';
  return out;
}

function parseManifest(text) {
  const out = {
    runId: '',
    ticketId: '',
    ticketUrl: '',
    clickupStatus: '',
    objective: '',
    currentStatus: '',
    currentStage: '',
    currentGate: '',
    createdAt: '',
    outputFiles: [],
    decisions: [],
  };
  if (!text) return out;

  for (const sec of splitByHeading(text, 2)) {
    const h = (sec.heading || '').toLowerCase();
    if (h === 'run id') out.runId = firstValue(sec.lines);
    else if (h === 'source ticket') {
      const kv = parseKeyValues(sec.lines);
      out.ticketId = kv['ticket id'] || '';
      out.ticketUrl = kv['ticket url'] || '';
      out.clickupStatus = kv['live clickup status'] || '';
    } else if (h === 'objective') out.objective = firstValue(sec.lines);
    else if (h === 'current status') out.currentStatus = firstValue(sec.lines);
    else if (h === 'current stage') out.currentStage = firstValue(sec.lines);
    else if (h === 'current gate') out.currentGate = firstValue(sec.lines);
    else if (h === 'created at') out.createdAt = firstValue(sec.lines);
    else if (h === 'output files') {
      for (const raw of sec.lines) {
        const l = raw.replace(/^\s*[-*]\s+/, '').trim();
        if (!l) continue;
        const m = l.match(/^(\S+\.md)\s*-\s*(.*)$/);
        out.outputFiles.push(m ? { name: m[1], state: m[2].trim() } : { name: l, state: '' });
      }
    } else if (h === 'human decisions') {
      out.decisions = parseManifestDecisions(sec.lines.join('\n'));
    }
  }
  return out;
}

function parseManifestDecisions(text) {
  const decisions = [];
  for (const sub of splitByHeading(text || '', 3)) {
    if (!sub.heading) continue;
    const idm = sub.heading.match(/^(D\d+)\b\s*[-–—]?\s*(.*)$/);
    const dec = {
      id: idm ? idm[1] : sub.heading,
      title: idm ? idm[2].trim() : '',
      status: '',
      decision: '',
      recommendation: '',
      options: [],
    };
    let optStart = -1;
    for (let i = 0; i < sub.lines.length; i++) {
      if (/^options:?\s*$/i.test(sub.lines[i].trim())) {
        optStart = i + 1;
        break;
      }
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

function parseHumanDecisions(text) {
  if (!text) return [];
  const sections = splitByHeading(text, 2).filter((s) => /^D\d+/.test(s.heading || ''));
  return sections.map((s) => {
    const idm = s.heading.match(/^(D\d+)\b\s*[-–—]?\s*(.*)$/);
    const kv = parseKeyValues(s.lines);
    return {
      id: idm ? idm[1] : s.heading,
      title: idm ? idm[2].trim() : '',
      status: (kv.status || '').toLowerCase(),
      type: kv.type || '',
      decidedBy: kv['decided by'] || '',
      resolvedAt: kv['resolved at'] || '',
      options: parseNumberedList(s.lines),
      rationale: '',
      humanResponse: '',
      recordedDecision: '',
      recordedAction: '',
    };
  });
}

function parseJournal(text) {
  const out = { note: '', entries: [] };
  if (!text) return out;
  let cur = null;
  const flush = () => {
    if (!cur) return;
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
  };

  for (const line of text.split(/\r?\n/)) {
    const hm = line.match(/^###\s+(.*)$/);
    if (hm) {
      flush();
      const header = hm[1].trim();
      const parts = header.split(/\s+[—–-]\s+/);
      cur = {
        date: parts[0] || header,
        event: parts.length > 1 ? parts.slice(1).join(' - ') : '',
        bodyLines: [],
        summary: '',
        detailLabel: '',
        detailHref: '',
      };
    } else if (cur) cur.bodyLines.push(line);
    else if (/note:/i.test(line) && !out.note) out.note = line.trim();
  }
  flush();
  return out;
}

function fileNumPrefix(name) {
  const m = name.match(/^(\d{2})_/);
  return m ? m[1] : null;
}

function parseQuip(scoresDir) {
  const files = listFiles(scoresDir).filter((f) => /^QUIP_score_v\d+\.md$/i.test(f));
  const scores = files
    .map((file) => {
      const version = Number(file.match(/^QUIP_score_v(\d+)\.md$/i)[1]);
      const text = readFileSafe(path.join(scoresDir, file)) || '';
      const statusM = text.match(/\*\*Score Status:\*\*\s*([a-z-]+)/i);
      const scoreM = text.match(/^Total Score:\s*([\d.]+)\s*$/m);
      const trigM = text.match(/\*\*Trigger:\*\*\s*(\w+)/i);
      let openCount = 0;
      const marker = '<!-- quip:open-questions -->';
      const idx = text.indexOf(marker);
      if (idx !== -1) {
        for (const raw of text.slice(idx + marker.length).split(/\r?\n/)) {
          const t = raw.trim();
          if (t.startsWith('##')) break;
          if (/^none\b/i.test(t)) {
            openCount = 0;
            break;
          }
          if (t.startsWith('- ')) openCount++;
        }
      }
      return {
        file,
        version,
        status: statusM ? statusM[1].trim().toLowerCase() : 'unknown',
        totalScore: scoreM ? scoreM[1] : null,
        trigger: trigM ? trigM[1].trim().toLowerCase() : null,
        openCount,
      };
    })
    .sort((a, b) => a.version - b.version);
  return { scores, latest: scores.length ? scores[scores.length - 1] : null };
}

function buildRun(ticketFolder, runFolder, runDir) {
  const files = listFiles(runDir);
  const fileByNum = {};
  for (const f of files) {
    const n = fileNumPrefix(f);
    if (n && !fileByNum[n]) fileByNum[n] = f;
  }
  const manifest = parseManifest(readFileSafe(path.join(runDir, '00_run_manifest.md')));
  const decisions = parseHumanDecisions(readFileSafe(path.join(runDir, '08_human_decisions.md')));
  const recById = {};
  for (const d of manifest.decisions) recById[d.id] = d.recommendation;
  const artefacts = ARTEFACTS.map((a) => ({
    ...a,
    present: Boolean(fileByNum[a.num]),
    file: fileByNum[a.num] || null,
  }));

  let pending = decisions.find((d) => d.status === 'pending');
  let pendingOptions = pending ? pending.options : [];
  let pendingRec = pending ? recById[pending.id] || '' : '';
  let pendingTitle = pending ? `${pending.id} - ${pending.title}` : '';
  if (!pending && manifest.currentGate && !isTBC(manifest.currentGate)) {
    const md = manifest.decisions.find((d) => manifest.currentGate.startsWith(d.id));
    if (md && (md.status || '').toLowerCase() === 'pending') {
      pendingTitle = manifest.currentGate;
      pendingOptions = md.options;
      pendingRec = md.recommendation;
    }
  }

  return {
    ticketFolder,
    folder: runFolder,
    dir: runDir,
    manifest,
    decisions,
    artefacts,
    pending: pendingTitle ? { title: pendingTitle, options: pendingOptions, recommendation: pendingRec } : null,
  };
}

function newestManifest(runs) {
  return runs.length ? runs[runs.length - 1].manifest : {};
}

function nextStatus(status) {
  if (!status) return '';
  const idx = STATUS_ORDER.findIndex((s) => s.toLowerCase() === status.toLowerCase());
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : '';
}

function buildTicket(ticketFolder) {
  const ticketDir = path.join(TICKETS_DIR, ticketFolder);
  const runsDir = path.join(ticketDir, 'runs');
  const runs = listDirs(runsDir).map((runFolder) =>
    buildRun(ticketFolder, runFolder, path.join(runsDir, runFolder))
  );
  const quip = parseQuip(path.join(ticketDir, 'scores'));
  const meta = parseTicketIndex(readFileSafe(path.join(ticketDir, '_ticket.md')));
  const fallback = newestManifest(runs);
  const parts = splitTicketFolder(ticketFolder);

  const title = meta.title || fallback.objective || parts.slug.replace(/-/g, ' ');
  const clickupId = cleanMdValue(meta.clickupId || fallback.ticketId || parts.id);
  const clickupUrl = cleanMdValue(meta.clickupUrl || fallback.ticketUrl || '');
  const liveStatus = cleanMdValue(meta.liveStatus || fallback.clickupStatus || fallback.currentStatus || '');
  const currentStage = cleanMdValue(meta.currentStage || fallback.currentStage || '');
  const product = cleanMdValue(meta.product || '');
  const created = cleanMdValue(meta.created || fallback.createdAt || '');
  const whatItIs = meta.whatItIs || fallback.objective || '';

  return {
    folder: ticketFolder,
    dir: ticketDir,
    meta: { title, clickupId, clickupUrl, liveStatus, currentStage, product, created, whatItIs },
    journal: parseJournal(readFileSafe(path.join(ticketDir, '_journal.md'))),
    runs,
    quip,
    pending: runs.some((r) => r.pending),
    nextStatus: nextStatus(liveStatus),
  };
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('await') || s.includes('pending') || s.includes('gate')) return 'st-await';
  if (s.includes('closed') || s.includes('reject') || s.includes('cancel')) return 'st-closed';
  if (s.includes('scheduled') || s.includes('complete') || s.includes('approved') || s.includes('resolved')) return 'st-done';
  return 'st-active';
}

function hrefFor(...parts) {
  return `../${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}

function renderOptions(options) {
  if (!options || !options.length) return '';
  return `<ol class="options">${options.map((o) => `<li>${htmlEscape(o.text)}</li>`).join('')}</ol>`;
}

function renderArtefacts(run) {
  return `<ul class="artefacts">${run.artefacts
    .map((a) => {
      const label =
        a.present && a.file
          ? `<a class="alabel alink" href="${hrefFor(
              'quorum-tickets',
              run.ticketFolder,
              'runs',
              run.folder,
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

function renderScores(ticket) {
  if (!ticket.quip.scores.length) return '<p class="muted">No QUIP scores recorded.</p>';
  return `<ul class="artefacts">${ticket.quip.scores
    .map((s) => {
      const provisional = s.status.startsWith('provisional') || s.openCount > 0;
      return `<li class="yes"><span class="tick">&#10003;</span><span class="anum">v${s.version}</span><a class="alabel alink" href="${hrefFor(
        'quorum-tickets',
        ticket.folder,
        'scores',
        s.file
      )}" target="_blank" rel="noopener">${htmlEscape(s.file)}</a><span class="astate">${
        s.totalScore ? htmlEscape(s.totalScore) : '?'
      } ${htmlEscape(s.status)}${provisional ? ' - provisional' : ''}</span></li>`;
    })
    .join('')}</ul>`;
}

function renderDecision(d) {
  return `<div class="decision"><div class="dhead"><span class="pill ${statusClass(d.status)}">${htmlEscape(
    d.status || 'unknown'
  )}</span><strong>${htmlEscape(d.id)}</strong> - ${htmlEscape(d.title)}</div>${renderOptions(d.options)}</div>`;
}

function journalHref(ticketFolder, href) {
  if (!href) return '';
  if (/^[a-z]+:/i.test(href) || href.startsWith('/')) return href;
  return hrefFor('quorum-tickets', ticketFolder, ...href.split(/[\\/]+/).filter(Boolean));
}

function renderJournal(ticket) {
  const journal = ticket.journal;
  if (!journal || !journal.entries.length) return '<p class="muted">No context journal found for this ticket.</p>';
  return `<ol class="journal">${journal.entries
    .map(
      (e) => `<li>
        <div class="jhead"><span class="jdate">${htmlEscape(e.date)}</span><span class="jevent">${htmlEscape(e.event)}</span></div>
        <div class="jsummary">${htmlEscape(e.summary)}</div>
        ${
          e.detailHref
            ? `<div class="jlink">&#8594; Full detail: <a href="${htmlEscape(journalHref(ticket.folder, e.detailHref))}" target="_blank" rel="noopener"><code>${htmlEscape(
                e.detailLabel || e.detailHref
              )}</code></a></div>`
            : ''
        }
      </li>`
    )
    .join('')}</ol>`;
}

function renderRun(run) {
  const producedCount = run.artefacts.filter((a) => a.present).length;
  return `<details class="run-detail" ${run.pending ? 'open' : ''}>
    <summary><strong>${htmlEscape(run.folder)}</strong><span>${producedCount}/${run.artefacts.length} artefacts</span>${
      run.pending ? '<span class="pill st-await">pending gate</span>' : ''
    }</summary>
    ${run.manifest.objective ? `<p class="objective">${htmlEscape(run.manifest.objective)}</p>` : ''}
    ${
      run.pending
        ? `<div class="gate"><div class="gate-label">&#9873; Pending gate</div><div class="gate-title">${htmlEscape(
            run.pending.title
          )}</div>${
            run.pending.recommendation
              ? `<div class="gate-rec"><span class="dk">Recommendation</span> ${htmlEscape(run.pending.recommendation)}</div>`
              : ''
          }${renderOptions(run.pending.options)}<div class="gate-note">Decision is made through Claude Code (the Orchestrator), not this dashboard.</div></div>`
        : ''
    }
    ${renderArtefacts(run)}
    ${
      run.decisions.length
        ? `<h4>Decision history</h4>${run.decisions.map(renderDecision).join('')}`
        : '<p class="muted">No decisions recorded in 08_human_decisions.md.</p>'
    }
  </details>`;
}

function renderTicket(ticket, idx) {
  const m = ticket.meta;
  const latest = ticket.quip.latest;
  const quipProvisional = latest && (latest.status.startsWith('provisional') || latest.openCount > 0);
  const clickup =
    m.clickupUrl && !isTBC(m.clickupUrl)
      ? `<a href="${htmlEscape(m.clickupUrl)}" target="_blank" rel="noopener">${htmlEscape(m.clickupId || 'ClickUp')}</a>`
      : htmlEscape(isTBC(m.clickupId) ? 'TBC' : m.clickupId);

  return `<section class="run" id="ticket-${idx}">
    <header class="run-head">
      <div class="run-title">
        <h2>${htmlEscape(m.title)}</h2>
        <div class="run-sub">
          <span class="pill ${statusClass(m.liveStatus)}">${htmlEscape(m.liveStatus || 'unknown')}</span>
          <span class="kv">Folder: <strong>${htmlEscape(ticket.folder)}</strong></span>
          <span class="kv">ClickUp: <strong>${clickup}</strong></span>
          ${m.currentStage ? `<span class="kv">Stage: ${htmlEscape(m.currentStage)}</span>` : ''}
          <span class="kv">${ticket.runs.length} run${ticket.runs.length === 1 ? '' : 's'}</span>
          ${latest ? `<span class="kv">QUIP v${latest.version}: <strong>${htmlEscape(latest.totalScore || '?')}</strong></span>` : ''}
          ${quipProvisional ? '<span class="pill st-await">provisional</span>' : ''}
        </div>
        ${m.whatItIs ? `<p class="objective">${htmlEscape(m.whatItIs)}</p>` : ''}
      </div>
    </header>

    <div class="cols">
      <div class="col">
        <h3>State now / next</h3>
        <p class="muted">Current ClickUp status: <strong>${htmlEscape(m.liveStatus || 'unknown')}</strong>${
          ticket.nextStatus ? `; next status: <strong>${htmlEscape(ticket.nextStatus)}</strong>` : ''
        }.</p>
        <h3>Runs</h3>
        ${ticket.runs.length ? ticket.runs.map(renderRun).join('') : '<p class="muted">No delivery runs recorded for this ticket.</p>'}
      </div>
      <div class="col">
        <h3>Scores</h3>
        ${renderScores(ticket)}
        <h3>History / journal</h3>
        ${ticket.journal.note ? `<p class="muted">${htmlEscape(ticket.journal.note.replace(/^\**|\**$/g, ''))}</p>` : ''}
        ${renderJournal(ticket)}
      </div>
    </div>
  </section>`;
}

function renderPage(tickets, generatedAt, stats) {
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
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); background: var(--bg); line-height: 1.5; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 20px 64px; }
  header.page { border-bottom: 3px solid var(--navy); padding-bottom: 16px; margin-bottom: 24px; }
  header.page h1 { margin: 0 0 4px; color: var(--navy); font-size: 24px; }
  .sub, .muted { color: var(--muted); font-size: 13px; }
  .summary-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px 16px; }
  .stat b { display: block; font-size: 22px; color: var(--navy); }
  .stat span { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .readonly { background: #eef2f7; border: 1px dashed #b6c4d6; color: #3d5872; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-top: 16px; }
  .run { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 20px 22px; margin-bottom: 22px; box-shadow: 0 1px 2px rgba(10,37,64,0.04); }
  .run-title h2 { margin: 0; font-size: 17px; color: var(--navy); word-break: break-word; }
  .run-sub { display: flex; gap: 10px 14px; flex-wrap: wrap; align-items: center; margin-top: 8px; font-size: 13px; color: var(--muted); }
  .kv strong { color: var(--ink); }
  .objective { margin: 10px 0 0; font-size: 14px; color: var(--ink); }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; text-transform: lowercase; }
  .st-await { background: var(--await-bg); color: var(--await-fg); border-color: var(--await-br); }
  .st-done { background: var(--done-bg); color: var(--done-fg); border-color: var(--done-br); }
  .st-active { background: var(--active-bg); color: var(--active-fg); border-color: var(--active-br); }
  .st-closed { background: var(--closed-bg); color: var(--closed-fg); border-color: var(--closed-br); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
  .col h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin: 18px 0 10px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
  .col h3:first-child { margin-top: 0; }
  .run-detail { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .run-detail summary { cursor: pointer; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; color: var(--navy); }
  .run-detail summary span { color: var(--muted); font-size: 12px; }
  .gate { border-radius: 8px; padding: 12px 14px; margin: 12px 0; border: 1px solid var(--await-br); background: var(--await-bg); }
  .gate-label, .dk { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--await-fg); }
  .gate-title { font-size: 15px; font-weight: 700; color: var(--navy); margin: 2px 0 8px; }
  .gate-note { font-size: 12px; color: var(--await-fg); margin-top: 8px; font-style: italic; }
  .options { margin: 6px 0 0; padding-left: 22px; }
  .options li { margin: 3px 0; font-size: 13px; }
  .artefacts { list-style: none; margin: 0; padding: 0; }
  .artefacts li { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
  .artefacts .tick { width: 16px; text-align: center; }
  .artefacts li.yes .tick { color: #1e6b3a; }
  .artefacts li.no { color: var(--muted); }
  .artefacts li.no .tick { color: #b6c4d6; }
  .anum { font-variant-numeric: tabular-nums; color: var(--muted); width: 34px; }
  .alabel { flex: 1; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .astate { font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted); }
  .decision { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin: 10px 0; }
  .dhead { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; font-size: 14px; }
  .journal { margin: 12px 0 0; padding-left: 0; list-style: none; }
  .journal li { border-left: 2px solid var(--line); padding: 0 0 14px 16px; position: relative; }
  .journal li::before { content: ""; position: absolute; left: -5px; top: 4px; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; }
  .jhead { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
  .jdate { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .jevent { font-size: 13px; font-weight: 700; color: var(--navy); }
  .jsummary { font-size: 13px; margin-top: 2px; }
  .jlink { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .jlink code { background: #f0f3f7; padding: 1px 5px; border-radius: 4px; }
  footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="page">
    <h1>Quorum Dashboard</h1>
    <div class="sub">Read-only view of ticket, run, score, and context-journal state &middot; generated ${htmlEscape(generatedAt)}</div>
    <div class="summary-bar">
      <div class="stat"><b>${stats.tickets}</b><span>Tickets</span></div>
      <div class="stat"><b>${stats.awaiting}</b><span>Awaiting a gate</span></div>
      <div class="stat"><b>${stats.provisional}</b><span>Provisional QUIP</span></div>
    </div>
    <div class="readonly"><strong>Read-only.</strong> This dashboard displays state only. It does not approve gates or write back to any file, ClickUp, or Supabase. Gate approvals happen through Claude Code (the Orchestrator) in session, never from the browser.</div>
  </header>

  ${tickets.length ? tickets.map(renderTicket).join('\n') : '<p class="muted">No tickets found under quorum-tickets/.</p>'}

  <footer>Generated by dashboard/generate_dashboard.cjs &middot; re-run to refresh.</footer>
</div>
</body>
</html>`;
}

function buildDashboardHtml() {
  const tickets = listDirs(TICKETS_DIR).map(buildTicket);
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const stats = {
    tickets: tickets.length,
    awaiting: tickets.filter((t) => t.pending).length,
    provisional: tickets.filter((t) => {
      const q = t.quip.latest;
      return q && (q.status.startsWith('provisional') || q.openCount > 0);
    }).length,
  };
  return { html: renderPage(tickets, generatedAt, stats), stats };
}

function main() {
  const { html, stats } = buildDashboardHtml();
  fs.mkdirSync(SCRIPT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  console.log('Quorum dashboard generated.');
  console.log(`  Tickets scanned:   ${stats.tickets}`);
  console.log(`  Awaiting a gate:   ${stats.awaiting}`);
  console.log(`  Provisional QUIP:  ${stats.provisional}`);
  console.log(`  Output:            ${OUT_FILE}`);
}

if (require.main === module) main();

module.exports = { buildDashboardHtml, TICKETS_DIR, OUT_FILE, ROOT, SCRIPT_DIR };
