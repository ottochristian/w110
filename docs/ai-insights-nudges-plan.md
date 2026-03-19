# AI Insights & Nudges Plan

_Last updated: 2026-03-19_

---

## Status

### ✅ Phase 1 — DONE (committed on `feat/ai-insights-nudges`)
- Admin sidebar renamed `Analytics` → `Insights`, points to `/admin/insights`
- `ClubIntelligenceWidget` extracted into reusable component (`components/club-intelligence-widget.tsx`) — accepts configurable `summaryEndpoint`, `chatEndpoint`, `chips`, `title`
- `/admin/insights/page.tsx` created — AI widget + links to analytics sub-pages
- Coach sidebar: added `Insights` nav item
- `/coach/insights/page.tsx` — stats strip + AI summary + Q&A chat scoped to coach's programs
- `/api/coach/ai/insights/route.ts` — GET cached / POST streaming summary
- `/api/coach/ai/chat/route.ts` — tool-use Q&A scoped to coach's assignments
- `migrations/79_coach_insights.sql` — coach_insights cache table with RLS

### 🔲 Phase 2 — NEXT: Dashboard redesign + Insights full suite (in progress decision-making)

---

## Confirmed Architecture Decisions (2026-03-19)

### Dashboard
- **AI greeting front and center** — no data pulled, no tool use
- Greeting uses time of day: "Good morning/afternoon/evening, [first_name]"
- Creative, ski-flavored one-liners (rotating phrases), e.g.:
  - "Good morning, Sarah — hope the snow's good today."
  - "Good afternoon, Mike. Ready to make it a great day on the mountain?"
  - "Good evening, Anna — another strong day for the club."
- Below greeting: slim stats strip + action items + recent activity (unchanged)
- **Remove** ClubIntelligenceWidget from dashboard entirely

### Insights Page (admin)
- **Intelligence Report** stays here (NOT on dashboard)
  - Auto-regenerates once per day: on load, check if `generated_at` is from today → show cache; if stale → silently regenerate in background while showing old cache
  - No manual refresh button needed (auto-handled)
- **Tabs** for analytics sections:
  | Tab | Status | Notes |
  |---|---|---|
  | Intelligence | Build | Daily report + Q&A chat |
  | Athletes | Build | Pull existing analytics/athletes content inline |
  | Programs | Build | Pull existing analytics/programs content inline |
  | Revenue | Build | New: orders/payments by period, by program |
  | Waivers | Build | New: completion rate by program/coach, outstanding list |
  | Custom Reports | Placeholder | Stage 1 builder later |
- `/analytics/athletes` and `/analytics/programs` become tabs (not standalone pages)

### Coach Insights Page
- Same tab structure, scoped to coach's programs
- Intelligence tab: coach-scoped daily summary + Q&A
- Simplified tabs: Intelligence | Athletes | Waivers (no Revenue tab for coaches)

---

## Phase 2 Build Plan

### Files to create/modify

**New:**
```
components/admin/greeting-widget.tsx          # Time-aware, ski-flavored greeting (no data)
app/clubs/[clubSlug]/admin/insights/page.tsx  # REWRITE — tabs + daily intelligence
```

**Modify:**
```
app/clubs/[clubSlug]/admin/page.tsx           # Remove AI widget, add greeting widget
app/api/admin/ai/insights/route.ts            # Update GET: auto-regenerate if stale (> 1 day)
```

**Possibly move/deprecate:**
```
app/clubs/[clubSlug]/admin/analytics/athletes/page.tsx   # Content pulled into tab
app/clubs/[clubSlug]/admin/analytics/programs/page.tsx   # Content pulled into tab
```

### Greeting widget details
- Pure client component, no API calls
- Gets `firstName` from profile (passed as prop or from auth context)
- Time of day logic: before 12 = morning, 12-17 = afternoon, after 17 = evening
- Rotating phrase pool per time slot (pick by `day of year % pool.length`)
- Design: large warm greeting text, subtle ski/mountain flavor, no border/card — feels like a natural welcome

### Daily intelligence cache logic
- `GET /api/admin/ai/insights`:
  - If `generated_at` is today (same calendar date in club's timezone) → return cache
  - If stale (yesterday or older) → return cache AND kick off background regeneration (fire-and-forget POST to self, or inline async)
  - Response includes `{ summary_text, generated_at, is_stale: boolean }`
- UI: if `is_stale`, show old summary with a subtle "Updating…" indicator while streaming new one

### Revenue tab (new)
Data sources: `orders`, `payments`
Charts/metrics:
- Revenue collected this season (total)
- Revenue by program (bar chart)
- Revenue by month (line chart)
- Outstanding payments count + total value
- Failed payments (last 30 days)
API: reuse `/api/admin/ai/insights/chat` tool `get_payment_summary`, or new dedicated endpoint

### Waivers tab (new)
Data sources: `waivers`, `waiver_signatures`, `registrations`
Charts/metrics:
- Completion rate by program (bar chart, % signed)
- Total outstanding athletes
- List: athletes with unsigned waivers (sortable by program/coach)
API: reuse existing waiver data from admin insights context

---

## Phase 3 — Nudges (after Phase 2)

### Coach nudges (interactive, AI-generated)
Flow:
1. DB signal detected: "8 families in Alpine U14 haven't signed the waiver"
2. Nudge card: AI-phrased title + detail + "Draft & Send" button
3. Click → fetch affected families → Claude writes `body_template` with `{{ placeholders }}`
4. Review modal: template shown, `{{ fields }}` highlighted orange
5. Hover tooltip on placeholder → shows first 3-4 real values (e.g. "Sarah, Mike, Anna +5 more")
6. Edit → Send → existing send API resolves per recipient

### Admin nudges (higher abstraction)
- "Alpine Racing (Coach Smith) has 34% waiver completion — follow up with Coach Smith?"
- Actions target coaches, not individual families

### Signals to detect
| Signal | Trigger |
|---|---|
| Unsigned waivers | athletes in coach's groups with no signature on required waiver |
| Outstanding payments | registrations with payment_status ≠ 'paid' > 7 days |
| Upcoming event < 48h | event in coach's groups |
| No messages sent | coach hasn't sent message in > 14 days |
| Low waiver completion (admin) | program < 60% signed |
| Coach inactive (admin) | coach with groups but 0 messages this season |

### Nudge API response shape
```json
{
  "id": "unsigned-waivers-alpine-u14",
  "type": "unsigned_waivers",
  "title": "8 families haven't signed the season waiver",
  "detail": "These families in Alpine U14 still need to sign before their athletes can participate.",
  "target": { "type": "group", "id": "...", "name": "Alpine U14" },
  "affected_families": [
    { "household_id": "...", "parent_first_name": "Sarah", "athlete_first_name": "Emma", "athlete_last_name": "Smith" }
  ],
  "draft_subject": "Reminder: Season waiver for {{ athlete_first_name }} hasn't been signed",
  "draft_body": "Hi {{ parent_first_name }},\n\nJust a quick reminder that the season waiver for {{ athlete_first_name }} {{ athlete_last_name }} hasn't been signed yet...",
  "recipient_count": 8
}
```

---

## Phase 4 — Personalized Send (merge fields)

### Changes to `/api/messages/send`
- Accept `body_template` with `{{ placeholder }}` syntax alongside `body`
- Resolve per recipient at send time:
  - `{{ parent_first_name }}` → guardian's first name
  - `{{ athlete_first_name }}` / `{{ athlete_last_name }}` → athlete name(s)
  - `{{ athlete_names }}` → comma-joined if multiple athletes per household
  - `{{ club_name }}` → club name
- Fallback: "there" for unresolved first names
- One email per household

### Review UI
- `{{ placeholder }}` tokens rendered as `<span>` with orange tint + underline
- Hover tooltip: shows first 3-4 resolved values for that field
- Editable before send

---

## Phase 5 — Custom Report Builder

### Stage 1 (config-based)
- Choose data source: Athletes / Revenue / Waivers / Registrations
- Choose dimensions: Program / Group / Season / Coach / Date
- Choose metric: Count / Sum / Percentage
- Choose viz: Table / Bar / Pie
- Save as named report
- Reports listed on Custom Reports tab

### Stage 2 (drag-and-drop canvas) — later
- Multiple widgets on a canvas
- Drag to position/resize
- Save as dashboard layout

---

## Key constraints
- All AI uses `claude-sonnet-4-6` via `@anthropic-ai/sdk`
- Per-club feature flags: `ai_enabled`, `ai_insights_enabled` on `clubs` table
- `ai_usage` table logs all AI calls (club_id, user_id, feature, tokens, model)
- Never auto-send emails — always human review before send
- Always work on a feature branch (`feat/ai-insights-nudges` is current)
