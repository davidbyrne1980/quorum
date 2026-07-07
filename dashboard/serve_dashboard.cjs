#!/usr/bin/env node
/*
 * Quorum Dashboard — Live Read-Only Server (Option 2)
 * ---------------------------------------------------
 * Serves the dashboard from http://localhost:<port>, rebuilding the HTML fresh
 * from disk on every page load, and watches quorum-tickets/ so
 * the open browser tab auto-refreshes whenever any ticket file changes.
 *
 * STRICTLY READ-ONLY. This server has NO write endpoints. It only serves GET
 * requests and rejects everything else. It cannot approve gates or modify any
 * file, ClickUp, or Supabase. Gate approvals still happen through Claude Code
 * (the Orchestrator) in session — never from the browser.
 *
 * Zero external dependencies — Node built-ins only (http, fs, path).
 *
 * Usage:   node dashboard/serve_dashboard.cjs [port]
 *          PORT=4319 node dashboard/serve_dashboard.cjs
 * Stop:    Ctrl-C
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { buildDashboardHtml, TICKETS_DIR, ROOT } = require('./generate_dashboard.cjs');

const PORT = Number(process.argv[2] || process.env.PORT || 4319);

// Client-side snippet injected into the served page: opens an SSE channel and
// reloads when the server signals a change. Reload re-fetches "/", which
// rebuilds from disk — so the page is always current with no manual regenerate.
const LIVE_SNIPPET = `
<script>
(function () {
  var dot = document.createElement('div');
  dot.id = 'live-indicator';
  dot.title = 'Live — auto-refreshes when ticket files change';
  dot.textContent = 'live';
  document.body.appendChild(dot);
  var s = document.createElement('style');
  s.textContent = '#live-indicator{position:fixed;bottom:12px;right:14px;background:#1e6b3a;color:#fff;' +
    'font:600 11px -apple-system,Segoe UI,sans-serif;padding:3px 10px;border-radius:999px;' +
    'letter-spacing:.04em;text-transform:uppercase;opacity:.85;z-index:9999}' +
    '#live-indicator.stale{background:#9a5b00}';
  document.head.appendChild(s);
  try {
    var es = new EventSource('/events');
    es.addEventListener('changed', function () { location.reload(); });
    es.onerror = function () { dot.classList.add('stale'); dot.textContent = 'reconnecting'; };
    es.onopen = function () { dot.classList.remove('stale'); dot.textContent = 'live'; };
  } catch (e) { dot.classList.add('stale'); dot.textContent = 'no live'; }
})();
</script>
`;

// -- SSE client registry -----------------------------------------------------
const clients = new Set();

function broadcastChange() {
  for (const res of clients) {
    try {
      res.write('event: changed\n');
      res.write(`data: ${Date.now()}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

// -- File watching (debounced) -----------------------------------------------
let debounceTimer = null;
function onFsEvent() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    console.log(`[${new Date().toISOString().slice(11, 19)}] change detected → refreshing ${clients.size} client(s)`);
    broadcastChange();
  }, 200);
}

function watchDir(dir) {
  try {
    // recursive works on Windows and macOS in modern Node.
    fs.watch(dir, { recursive: true }, onFsEvent);
    console.log(`  watching: ${dir}`);
  } catch (e) {
    console.warn(`  could not watch ${dir}: ${e.message}`);
  }
}

// -- HTTP server -------------------------------------------------------------
const server = http.createServer((req, res) => {
  // Read-only: reject anything that isn't a GET.
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET' });
    res.end('405 — this dashboard is read-only (GET only).');
    return;
  }

  const url = req.url.split('?')[0];

  if (url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { /* ignore */ }
    }, 25000);
    req.on('close', () => { clearInterval(keepAlive); clients.delete(res); });
    return;
  }

  if (url === '/' || url === '/index.html') {
    let html;
    try {
      html = buildDashboardHtml().html;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error building dashboard:\n' + e.stack);
      return;
    }
    // Inject the live-reload client just before </body>.
    html = html.replace('</body>', LIVE_SNIPPET + '</body>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }

  // Read-only artefact/journal files. The artefact hyperlinks resolve here in
  // served mode. Path is contained: only files physically inside quorum-tickets/
  // can be read — any traversal outside is refused.
  if (url.startsWith('/quorum-tickets/')) {
    let resolved;
    try {
      resolved = path.resolve(path.join(ROOT, decodeURIComponent(url)));
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('400');
      return;
    }
    const inTickets = resolved === TICKETS_DIR || resolved.startsWith(TICKETS_DIR + path.sep);
    if (!inTickets) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 — outside allowed directories');
      return;
    }
    fs.stat(resolved, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404');
        return;
      }
      // Serve markdown as plain text so it displays inline, read-only.
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      fs.createReadStream(resolved).pipe(res);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404');
});

server.listen(PORT, () => {
  console.log(`Quorum live dashboard (read-only) serving at:`);
  console.log(`  http://localhost:${PORT}`);
  watchDir(TICKETS_DIR);
  console.log(`Press Ctrl-C to stop.`);
});

process.on('SIGINT', () => { console.log('\nStopping.'); process.exit(0); });
