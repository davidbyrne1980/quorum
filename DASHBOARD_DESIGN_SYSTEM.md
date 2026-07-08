# Quorum Dashboard Design System

This file is the implementation contract for the Quorum dashboard visual system. Treat it as required, not inspirational.

## Required visual outcome

The generated dashboard must look like the `index.html` prototype, not a plain HTML report.

The first viewport must include:

- A compact Retail Insight product header.
- Oversized Monte Stella-style headline.
- A four-card metric strip.
- A full-width agent run counter strip.
- A 50/50 master-detail workspace with the ticket queue on the left and persistent ticket detail on the right.
- No decorative vertical lines or grid background behind the prototype.

If the generated output looks like a default browser document, a generic admin table, or a basic card report, it has failed the design contract even if the data is correct.

## Tokens

Use these exact CSS custom properties:

```css
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
```

Do not add new raw color values unless they already exist in the prototype. Prefer opacity, border, spacing, and hierarchy over extra color.

## Page shell

Use this page posture:

```css
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

.app-shell {
  width: min(1480px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 24px 0 40px;
}
```

No `linear-gradient` background grid. No `background-size` grid rules.

## Typography

Display:

- Use `var(--font-display)` for `h1`, panel titles, metric values, and ticket titles.
- H1 size: `clamp(42px, 5vw, 72px)`.
- H1 line height: `1`.
- Display letter spacing: `-0.03em`.

Body:

- Use `var(--font-body)` for normal UI text.
- Body text should be 14px to 17px depending on density.
- Body line height should be 1.45 to 1.6.

Metadata:

- Use `var(--font-mono)`.
- Uppercase labels require `letter-spacing: 0.08em`.
- Metadata labels should be 11px.

## Layout components

Use these component patterns from the prototype.

### Top bar

- One-column grid.
- 20px vertical rhythm.
- Bottom border: `3px solid var(--accent-secondary)`.
- Product mark: navy fill, white text, 8px radius, 1px navy border.

### Metric strip

- Four equal columns on desktop.
- 12px gap.
- Metric cards use:
  - 16px radius.
  - 1px `var(--border)` border.
  - White background.
  - 18px padding.
  - 112px minimum height.
- Priority metric uses navy fill and white foreground.

### Agent strip

- Full-width strip directly under the metric strip.
- 7 equal columns on desktop.
- Outer container:
  - 16px radius.
  - 1px `var(--border)` border.
  - white background.
  - 10px padding.
- Individual agent counters:
  - grey surface background.
  - 12px radius.
  - 1px border.
  - 74px minimum height.

### Workspace

- Desktop layout is a 50/50 grid:

```css
.workspace {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}
```

- Left pane is ticket queue.
- Right pane is persistent ticket detail.
- Do not replace this with a single full-width table.

### Panels

- Panels use 16px radius, 1px border, white background.
- Panel headers use a 3px blue bottom border.
- Panel header title uses display font at 28px.

### Queue tiles

- Ticket tiles are buttons, not plain list rows.
- Selected ticket:
  - navy background.
  - white foreground.
  - subtle 8px to 12px expansion into the gutter on desktop if practical.
- Non-selected ticket:
  - white or grey surface.
  - 1px border.
  - clear title, stage, gate, and tags.

### Detail pane

The detail pane must include:

- Ticket title.
- Current state.
- Human gate.
- Decision options.
- Copy prompt tile.
- Artefacts accordion.
- Context journal accordion.
- QUIP score accordion.
- Source state accordion.

Accordions should use a height or grid-row transition where practical. Keep them dense and readable.

## Interaction requirements

- Queue tabs filter tickets without a page reload.
- Clicking a ticket updates the persistent detail pane.
- Accordion sections expand and collapse.
- Copy prompt button copies the visible prompt to the clipboard.
- The dashboard never writes decisions to source files.

## Responsive behavior

Desktop and laptop:

- Keep the 50/50 master-detail split.
- Keep metric strip in 4 columns.
- Keep agent strip dense.

Tablet:

- Preserve queue/detail hierarchy.
- It is acceptable to stack queue over detail below roughly 900px.

Mobile:

- Stack sections.
- Metric strip becomes 2 columns or 1 column.
- Agent counters wrap.
- Buttons remain at least 44px high.

## Visual acceptance checklist

Before returning the work, compare the generated `dashboard/quorum_dashboard.html` against `index.html` and confirm:

- The first viewport clearly resembles the prototype.
- The UI does not look like a plain report.
- Retail Insight tokens are used exactly.
- The 50/50 queue/detail workspace is present on desktop.
- Agent counters are a styled strip, not a plain list.
- Artefact links are styled rows inside the detail pane, not raw URLs.
- The decision prompt is in a styled copy tile.
- There are no vertical/grid background lines.
- No extra colors, gradients, emoji icons, or invented metrics were added.
