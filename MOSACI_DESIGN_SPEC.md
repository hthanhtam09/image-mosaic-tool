# Mosaci — Design Specification

**Mosaci** is a SaaS that converts any image into print-ready **color-by-number / mosaic**
coloring pages and assembles them into a one-click **PDF coloring book**. Target users:
KDP / self-publishing creators who sell coloring books.

**Tech stack:** Next.js (App Router) · Supabase (auth + Postgres) · shadcn/ui · Tailwind ·
Motion (Framer Motion) · Three.js · TanStack (Query + Table) · Zod · Lemon Squeezy.

This document is a complete, build-ready design spec: design system first, then every
screen described in detail (layout, dimensions, components, content, states, interactions).

---

# 1. Design System

## 1.1 Color tokens

```
--background      #121212   Page base. Neutral near-black.
--surface         #1A1A1A   Cards, header, sidebar, inputs, popovers.
--surface-hover   #242424   Hover/active rows, hovered cards.
--primary         #C0CDE3   Primary button FILL (text on it = #121212).
--primary-hover   #D4DEEE   Primary button hover fill.
--accent          #C0CDE3   Highlights, active states, links-on-hover, focus rings,
                            icons, chart series. Same hue as primary.
--accent-deep     #8FA3C8   Secondary chart series, gradient end.
--text            #FFFFFF   Primary text.
--text-secondary  #9BA3B0   Muted text, captions, helper text.
--text-disabled   #5A5F68   Disabled labels.
--border          #262626   Default 1px borders / dividers.
--success         #6EE7B7   Paid / completed.
--warning         #FBBF24   Refunded / pending.
--error           #F87171   Failed / destructive.
```

Rules:
- `#C0CDE3` (soft periwinkle) is the ONLY non-neutral brand color. Everything else is
  neutral grayscale + white text.
- Because the accent is LIGHT, **primary buttons are filled `#C0CDE3` with dark `#121212`
  text** (not white text).
- Signature gradient: `linear-gradient(135deg, #C0CDE3 0%, #8FA3C8 100%)` — used only on
  hero headline keyword and a few large glows.
- Glows: blurred radial of `#C0CDE3` at 6–10% opacity, 120–200px blur.

## 1.2 Typography

- **UI / headings:** Inter. Display (48–64px / 700 / tracking -0.02em), H1 (36px/700),
  H2 (28px/600), H3 (20px/600), body (15–16px/400), small (13px/400), micro (11–12px).
- **Numbers / prices / stats / code / counts:** JetBrains Mono.
- Line-height: 1.5 body, 1.15 large headings. Max reading width for prose: 680–720px.

## 1.3 Spacing, radius, elevation

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96. Section vertical padding desktop
  96px, content gutters 32px.
- Radius: inputs/buttons 8px (`rounded-lg`), cards 12px (`rounded-xl`), hero tiles/modals
  16px (`rounded-2xl`), pills/chips full.
- Borders: 1px `--border`. Elevation = border + soft shadow `0 8px 30px rgba(0,0,0,.35)`;
  do not over-shadow — depth comes from border + subtle shadow, not heavy drop shadows.

## 1.4 Motion (Framer Motion)

- Page/section entrance: opacity 0→1 + translateY 16px→0, 500ms `cubic-bezier(.4,0,.2,1)`,
  staggered 60ms for lists.
- Wizard step change: cross-fade 250ms + outgoing UI translateY -12px, incoming +12px→0.
- Buttons: 150ms; primary gets a soft `--accent` glow on hover (`0 0 0 4px rgba(192,205,227,.15)`).
- Respect `prefers-reduced-motion`: disable transforms, keep opacity fades.

## 1.5 Iconography & imagery

- Line icons, 2px stroke, 20–24px (Lucide). Mosaic/tile motif for the logo.
- Background texture: faint 24px dot-grid `rgba(255,255,255,.02)` on hero/empty areas.
- Product screenshots framed in a macOS-style browser chrome (rounded-2xl, 1px border,
  three traffic-light dots, accent-tinted outer glow).

---

# 2. Core Components (define once, reuse everywhere)

**Buttons** (height 40px, radius 8px, 15px/500):
- Primary: fill `#C0CDE3`, text `#121212`, hover `#D4DEEE` + accent glow.
- Secondary/ghost: transparent, 1px `--border`, text `--text`, hover bg `--surface-hover`.
- Link/accent: text `#C0CDE3`, underline on hover.
- Destructive: text `--error`, hover bg `rgba(248,113,113,.1)`.
- Sizes: sm 32px, md 40px, lg 48px. Loading state shows a 16px spinner + label.

**Inputs / selects / textarea:** bg `--surface`, 1px `--border`, radius 8px, 40px tall,
placeholder `--text-secondary`, focus = 1px `--accent` border + `0 0 0 3px rgba(192,205,227,.15)` ring.

**Cards:** bg `--surface`, 1px `--border`, radius 12px, padding 20–24px. Hover (when
interactive): bg `--surface-hover`, border lightens toward `--accent`, lift translateY -2px.

**Chips / badges:** pill, bg `rgba(192,205,227,.12)`, text `--accent`. Status variants use
`--success / --warning / --error` tints.

**Stepper (horizontal):** dot + label per step. Completed = filled `--accent` dot with a
12px check, current = `--accent` ring (2px) + label in `--text`, upcoming = `--border` dot
+ `--text-secondary` label. Connector line 2px, fills `--accent` up to the current step.

**Tooltip / popover / dropdown:** bg `--surface`, 1px `--border`, radius 12px, shadow,
8px padding; arrow optional.

**Modal / drawer:** overlay `rgba(0,0,0,.6)` + 8px backdrop blur. Modal centered, max-width
per use, radius 16px. Drawer slides from right, width 420px.

**Table:** header row bg `--surface` sticky, 12px uppercase `--text-secondary` labels with
sort arrows, body rows separated by 1px `--border`, row hover `--surface-hover`, status as
chips, row actions in a `•••` menu. Pagination footer with rows-per-page select.

**Charts (TanStack + chart lib):** dark bg, series in `--accent` and `--accent-deep`,
gridlines `rgba(255,255,255,.05)`, mono axis labels, tooltip = popover style.

**Upload dropzone:** dashed 1.5px `--border`, radius 16px, bg `--surface`, centered upload
icon + primary/secondary text; hover/drag-over = `--accent` dashed border + 8% accent glow.

---

# 3. Shared Layouts

## 3.1 SHARED TOP HEADER (on EVERY screen — the unifying element)

- Fixed, 64px tall, full width, bg `--surface`, bottom 1px `--border`, z-50.
- **Far left (constant on all screens):** logo = mosaic-tile glyph (accent) + wordmark
  "Mosaci" (white, 18px/700). Always links to Home `/`.
- **Center + right adapt by context, but height/logo/border NEVER change:**
  - **Marketing context** (Home, Pricing, Blog): center nav links `Tools · Pricing ·
    Blog · Docs` (15px, `--text-secondary`, active/hover `--text`). Right: `Sign in`
    (ghost) + `Open Mosaic Tool` (primary).
  - **Tool context** (Mosaic Tool, Account, Admin): center = page title / wizard stepper.
    Right = usage chip + avatar menu (dropdown: Account, Billing, Admin if role, Sign out).
- On scroll (marketing): header gains a subtle backdrop blur + slightly stronger border.
- This continuity is the #1 rule: moving Home → Tool must NOT make the header jump or
  restyle — only the center/right content swaps.

## 3.2 MARKETING FOOTER (Home, Pricing, Blog)

- bg `--surface`, top 1px `--border`, padding 64px top / 32px bottom.
- 4 link columns: **Product** (Tools, Pricing, Changelog, Roadmap) · **Resources** (Blog,
  Docs, Tutorials, Help) · **Company** (About, Contact) · **Legal** (Terms, Privacy,
  Refund, License). Left of columns: logo + one-line tagline + newsletter (email input +
  primary "Subscribe"). Bottom bar: © Mosaci 2026, social icons, language select.

## 3.3 APP SHELL

- Shared header on top. Below it, a 72px left **ICON RAIL** (bg `--surface`, right 1px
  `--border`) used in the Mosaic Tool **Choose** step and conceptually for tool switching;
  active item = `--accent` left bar (3px) + tinted rounded-square + accent icon + tooltip.
- Admin uses a wider **240px labeled sidebar** variant (icon + label rows).

---

# 4. Screen Specs

## 4.1 HOME / LANDING (`/`)

Marketing shell (shared header + footer). One H1, semantic H2 per section, SEO-clean.

1. **Header** — marketing state (see 3.1).
2. **Hero** (min-height 88vh, centered column, max-width 1100px):
   - Background: dot-grid + two blurred accent radials (top-left, bottom-right, ~8%).
   - Eyebrow pill: "✦ New — AI background removal" (accent-tinted, 13px).
   - H1 (display, 2 lines, centered): "Turn any image into a **color-by-number book** in
     seconds." — the phrase "color-by-number book" filled with the 135° accent gradient.
   - Subhead (18px, `--text-secondary`, 1 line): "Upload, pick a mosaic style, export a
     print-ready PDF. Built for KDP creators."
   - CTA row: `Start free →` (primary, lg) + `Watch demo` (ghost, lg, play icon).
   - Micro trust line (13px muted): "No credit card · 5 free exports/month".
   - Below CTAs: large product screenshot in a browser frame (width ~960px) showing the
     dark Mosaic Tool with a colorful mosaic grid + numbered palette. 3–4 low-opacity 3D
     mosaic tiles (Three.js) drift slowly in the corners behind the frame.
3. **Social proof strip:** centered muted line "Trusted by 2,000+ coloring-book
   publishers" + a row of 5 faded monochrome logo placeholders.
4. **Features — bento grid** (max-width 1100px, asymmetric 3-col, 5 cards):
   - Large (2×1) **"10 mosaic styles"** with a small visual sampler of pattern tiles
     (square, circle/honeycomb, diamond, hexagon, puzzle, islamic, fish-scale, trapezoid,
     square-mark, hexagon-mark).
   - **"Object Focus — auto background removal"** with a before→after thumbnail.
   - **"Bulk folder upload"** with a folder-tree mini visual.
   - **"Before/After generator"** with an arrow-split image.
   - **"One-click PDF book export"** with a stacked-pages visual.
   - Each card: 40px accent icon in a tinted rounded square, H3 title, one muted line,
     hover lift + accent border.
5. **How it works** — 3 steps on a thin accent dashed connector: `01 Upload images ·
   02 Pick pattern & palette · 03 Export PDF / ZIP`. Big mono numbers in accent, title,
   1 line each, small illustration per step.
6. **Interactive showcase:** a draggable before/after comparison slider — a real photo on
   one side morphs into a numbered mosaic page on the other; handle + divider in accent.
7. **Pricing teaser:** 3 compact plan cards (Free, Pro [accent border + "Most popular"
   badge], Studio); mono price, 3 bullets, CTA each; below, link "See full pricing →".
8. **Testimonial:** one large quote card — quote, avatar, name, role "KDP author", 5
   accent stars.
9. **Final CTA band:** full-width panel with an accent gradient glow, centered H2 "Start
   building your coloring book today", `Start free` primary + `Talk to us` ghost.
10. **Footer** (see 3.2).

## 4.2 AUTH — Sign in / Sign up (`/login`)

Standalone (no shell), but logo top-left links Home. Full-viewport split layout.
- **Left panel (≥1024px only, 45% width):** bg `--background` + a large accent radial glow
  (~8%) + faint dot-grid. Top-left: Mosaci logo. Centered: tagline "Turn images into
  coloring books." + a faint floating 3D mosaic-tile cluster (Three.js, subtle).
- **Right panel (55%, centered card max-width 400px, bg `--surface`, 1px `--border`,
  radius 16px, padding 32px):**
  - **Sign-in state:** H2 "Sign in to Mosaci"; email input; password input (show/hide
    toggle); `Continue` primary (full width); divider "or continue with"; two OAuth
    buttons (Google, GitHub) via Supabase Auth; "Forgot password?" link (right-aligned,
    accent); footer line "Don't have an account? **Sign up**".
  - **Sign-up state:** same card with name + email + password (+ strength hint) +
    `Create account` primary; footer "Already have an account? **Sign in**".
  - Inline error states under fields (`--error`), success → redirect to `/tools`.
- Mobile: left panel hidden, card centered full-width with 16px gutters.

## 4.3 MOSAIC TOOL (`/tools`) — 6-step wizard, each a full screen

The Mosaic Tool is NOT one cluttered screen. It is a wizard of **6 distinct full screens**.
When advancing, the previous step's UI is fully removed (not hidden) and the next fades in.
Persistent across all 6: shared header + a horizontal **stepper** directly under it:
`① Choose · ② Import · ③ Convert · ④ Review · ⑤ Setup · ⑥ Export`.

**Header in app context:** logo left (→ Home), center = "Coloring Book Generator" + the
stepper, right = usage chip "12 / 50 exports" (mono) + avatar menu.

### STEP ① — Choose tool
- The ONLY step showing the **72px icon rail** (5 tools: Standard Import, Object Focus,
  Folder Upload, Before/After, Mark Practice). Active item = accent left bar + tinted
  square + accent icon; hover tooltip with the tool name.
- Content area (centered on dot-grid + soft accent glow): large rounded-2xl accent icon
  tile (96px) for the selected tool, H1 tool title, a 1–2 line description, then a primary
  `Select Images →` button (lg). For tools with a sub-option (e.g. Before/After,
  Mark Practice) show a small inline select (Square mark / Hexagon mark) above the button.
- Tool descriptions:
  - **Standard Import:** "Convert multiple images into mosaic patterns across the full
    frame. 10 grid styles."
  - **Object Focus:** "Auto-remove white backgrounds to isolate the subject — perfect for
    character stickers." (purple-free; keep accent.)
  - **Folder Upload:** "Bulk-upload pre-separated color/ uncolor/ palette/ folders."
  - **Before/After:** "Generate a before→after PNG: uncolored left, colored right."
  - **Mark Practice:** "Export each mark as its own practice PNG strip."
- Clicking the CTA → STEP ②. The icon rail disappears for all later steps.

### STEP ② — Import
- No icon rail; full-width content. Centered large **dropzone** (max-width 720px, min-height
  320px): upload icon, "Drag & drop images here", "or **browse files**" (accent), hint
  "PNG or JPG · up to 100 images".
- After files added: dropzone shrinks to a top bar; below it a horizontal **thumbnail
  strip** of selected files (each 80px, filename truncated, hover × to remove) + a count
  chip "12 images" (mono) + a `+ Add more` ghost tile.
- Bottom **action bar** (sticky, right-aligned): `Back` ghost (→ ①) + `Continue to
  Convert →` primary (disabled until ≥1 file).
- This step is import-only: no grid options, no settings.

### STEP ③ — Convert (processing)
- No rail; dedicated processing screen, import UI cleared.
- Centered: a large **circular progress ring** (accent, mono % in center) + status line
  "Converting 7 / 12 images…". Below: a responsive grid of small thumbnails, each with its
  own state — queued (dimmed), processing (accent spinner overlay), done (accent check
  badge), error (red badge + retry icon).
- Top-right: subtle `Cancel` ghost (returns to ②).
- On completion: auto-advance to ④ after 600ms, OR show a centered primary `Review
  results →` if any errors need attention.

### STEP ④ — Review & adjust
- No rail; results screen. Top **slim toolbar:** left = "12 images ready" count; right =
  `+ Add More` ghost, `Download All (.zip)` ghost, `Continue to Setup →` primary.
- **Project grid** (responsive, 3–4 per row, gap 16px). Each **project card** (radius 12px):
  - Converted mosaic thumbnail (square, top), filename below (truncated).
  - A `Completed` status chip (accent check).
  - A **grid-type dropdown** (Square, Circle, Diamond, Hexagon, Puzzle, Islamic, Fish
    Scale, Trapezoid, Square mark, Hexagon mark) — changing it re-converts that card.
  - A **split-color dropdown** (Full color, Diagonal ↗, Diagonal ↘, Top half, Bottom half).
  - Hover reveals: `Preview` (eye) and `Delete` (trash) icon buttons.
- Clicking a card opens a **Preview modal** (max-width 900px): large mosaic render on the
  left, numbered palette list on the right (swatch + code + color name), close × top-right.

### STEP ⑤ — Setup (output settings + PDF assembly)
- No rail; the review grid is cleared; this screen is dedicated to settings. Two-column
  layout (left 380px settings, right flexible assembly), with a third preview region.
- **Left column — "Output settings" card:**
  - Cell-size slider (accent thumb, mono value label).
  - Toggles: Show Numbers · Show Palette · Export Palette (separate PNG).
  - Theme picker: a row of 10 color swatches (Light, Dark, Navy, Deep Forest, Burgundy,
    Coffee Brown, Royal Purple, Sunset Orange, Deep Teal, Deep Pink); selected = accent ring.
  - Grid Type select (applies to all / "auto cycle").
- **Right column — "PDF assembly":** a vertical list of dashed upload drop cards, each
  showing title + count + a thumbnail row + remove:
  - Prefix pages · Background images · CSV story text (shows a file chip + parsed row
    count) · Palette images · Solution collage · Suffix pages.
  - A "Show story text input" toggle.
- **Preview region** (far right or below on narrow widths): a live **PDF page preview** in
  a paper frame with prev/next page arrows and a page indicator (mono "3 / 100").
- Bottom action bar: `Back` ghost (→ ④) + `Generate PDF →` primary.

### STEP ⑥ — Export
- No rail; setup UI cleared. Two states:
  - **Generating:** centered large accent progress ring (mono %), status "Rendering page
    24 / 100…", on dot-grid + accent glow. A determinate bar mirrors the ring.
  - **Success:** big accent check badge, H2 "Your book is ready 🎉", a primary `Download
    PDF` button + ghost `Start new book` (resets to ①), and a small summary card (mono):
    pages count · file size · render time. Optional secondary `Download images (.zip)`.

## 4.4 PRICING / PAYMENT (`/pricing`)

Marketing shell. 
- **Header block:** H1 "Simple pricing that scales with your books", muted subline, and a
  monthly/yearly **toggle pill** (yearly shows an accent "Save 20%" badge).
- **Plan cards — 3 in a row** (radius 12px, padding 28px):
  - **Free — $0:** 5 exports/mo · 3 mosaic styles · watermark on exports. Ghost CTA "Start
    free".
  - **Pro — highlighted** (accent 1px border + soft accent glow + floating "Most popular"
    badge): mono price /mo. Unlimited exports · all 10 styles · no watermark · PDF book
    export · Before/After · Object Focus. Primary CTA "Get Pro".
  - **Studio:** everything in Pro · bulk folder upload · priority rendering · commercial
    license. Ghost CTA "Get Studio".
  - Each card: plan name, mono price + "/month", feature checklist with accent check icons.
- **Feature comparison table:** rows of features × 3 plan columns, accent checks / muted
  dashes, sticky header, subtle zebra rows.
- **Checkout** = right **drawer** (420px) over the page when a CTA is clicked: "Order
  summary" — selected plan + billing cycle, line items, subtotal, tax, **total (large mono
  accent)**, `Proceed to checkout` primary (opens Lemon Squeezy hosted checkout). Small
  print: "Secure checkout via Lemon Squeezy · Cancel anytime · 14-day refund" + trust
  badges (lock, card logos).
- **FAQ accordion** (billing, refunds, commercial license, plan changes). Footer.

## 4.5 BLOG

### Index (`/blog`) — marketing shell
- Page header: H1 "Blog" + subtitle "Guides, tutorials and updates for coloring-book
  creators."
- Toolbar: category filter pills (All · Tutorials · KDP Tips · Product · Design; active =
  accent-tinted) on the left, search input on the right.
- **Featured post:** large horizontal card — cover image left (16:10), right side: accent
  category chip, H2 title, 2-line excerpt, author avatar + name + date + read time.
- **Post grid:** responsive 3-column cards — cover image (rounded top), category chip,
  H3 title, 2-line excerpt, footer row (author avatar + name, read time). Hover lift +
  accent border.
- **Newsletter band** (email input + primary Subscribe). Footer.

### Article (`/blog/[slug]`) — marketing shell
- Breadcrumbs: Home › Blog › {title}.
- Centered readable column (max-width 720px): accent category chip, H1 title, author row
  (avatar, name, date, read time, share icons), then a wide cover image.
- Body: Inter, 17px, line-height 1.7; H2/H3 anchors; blockquotes with a 3px accent left
  border; inline code + code blocks (JetBrains Mono on a darker surface); images with
  captions; lists.
- **Sticky Table of Contents** in the left margin (desktop ≥1280px), active section in
  accent.
- End of article: tag chips, author bio card, `Related posts` 3-card grid, newsletter CTA.
- SEO: single H1, descriptive meta, OpenGraph cover, JSON-LD Article.

## 4.6 ADMIN DASHBOARD (`/admin`, role-gated)

Admin shell with the **240px labeled sidebar** (Overview · Users · Payments · Revenue ·
Subscriptions · Settings; active = accent left bar + accent icon). Header (app context):
title left, right = date-range picker + search + admin avatar.

### Overview
- **KPI row — 4 stat cards:** Total Users · Active Subscriptions · MRR · Total Revenue.
  Each: 12px uppercase label, big mono value, a change pill (accent ▲ up / red ▼ down vs
  previous period), and a tiny sparkline.
- **Revenue area chart** (large card, full width): "Revenue over time" with weekly/monthly
  toggle; accent line + accent-to-transparent gradient fill, hover tooltip, mono Y-axis.
- **Two charts side by side:** a bar chart "New signups per month" (accent bars) and a
  donut "Revenue by plan" (Free / Pro / Studio in accent / accent-deep / muted slate) with
  legend + center total.
- **Recent payments table:** columns user (avatar + email), plan badge, amount (mono),
  status chip (Paid `--success` / Refunded `--warning` / Failed `--error`), date.
  Pagination.

### Users
- Powerful **TanStack data table:** filter bar on top (plan select, status select, search);
  columns: checkbox · avatar+name · email · plan badge · signup date · status
  (Active/Churned) · last active · row actions `•••` (view, change plan, suspend). Row
  selection reveals a bulk-action bar (export, email, suspend). Pagination + rows-per-page.

### Payments
- Summary stats on top (volume, refunds, failed) + a transactions table with filters
  (status, plan, date range) and an `Export CSV` button.

## 4.7 ACCOUNT / BILLING (`/account`)

Account shell. Centered content column (max-width 880px):
- **Profile card:** avatar, name, email, "Edit profile".
- **Current plan card:** plan name + badge, price, "Renews on {date}", `Upgrade` primary
  (→ Pricing) / `Manage subscription` ghost (Lemon Squeezy customer portal).
- **Usage card:** exports used this month — a labeled meter (accent fill) "32 / 50",
  resets-on date.
- **Invoice history table:** date, amount (mono), status chip, download icon.
- **Danger zone:** "Delete account" (destructive).

---

# 5. Responsive behavior

- Breakpoints: mobile <640, tablet 640–1024, desktop >1024, wide >1280.
- Header: on mobile, center nav collapses into a hamburger sheet; CTAs stay (or move into
  the sheet). Logo + one primary action always visible.
- Mosaic Tool: stepper becomes a compact "Step 3 of 6" label + progress bar on mobile; the
  Setup two-column layout stacks; project grid → 1–2 columns.
- Admin: sidebar collapses to icons / drawer; tables scroll horizontally with sticky first
  column.
- Pricing: plan cards stack vertically (Pro first); comparison table becomes an accordion.
- Blog: TOC hidden on <1280; grid → 1 column on mobile.

---

# 6. Route map (Next.js App Router)

```
/                    Home (static, SEO)
/pricing             Pricing + Lemon Squeezy checkout drawer
/blog                Blog index (ISR)
/blog/[slug]         Blog article (ISR)
/login               Auth (Supabase: email + Google/GitHub OAuth)
/tools               Tool workspace (protected) — 6-step wizard
/account             Account / billing
/admin               Admin dashboard (role-gated)
```

---

# 7. Accessibility & quality bar

- Contrast: white on `#121212` and `#121212` on `#C0CDE3` both pass AA. Muted text only
  for non-essential copy.
- Every interactive element has a visible focus ring (accent). Full keyboard nav for
  wizard, tables, menus, modals (focus trap + Esc to close).
- Inputs have labels; errors are announced; loading states have `aria-busy`.
- Hit targets ≥40px. Motion respects `prefers-reduced-motion`.
```
