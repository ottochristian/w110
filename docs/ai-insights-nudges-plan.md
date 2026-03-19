# AI Insights & Nudges Plan

_Last updated: 2026-03-19_

---

## Overview

Three-phase plan to add AI-powered insights, nudges, and personalized email drafting to both the coach and admin portals. All AI features use Claude (`claude-sonnet-4-6`) via the existing Anthropic SDK integration. Per-club feature gating already exists via `ai_enabled` / `ai_insights_enabled` flags on the `clubs` table.

**Core principle:** AI assists — it detects, phrases, and drafts. Humans review and send. Nothing goes out automatically.

---

## Phase 1 — Coach Insights Page + Admin Rename

### 1a. Admin sidebar rename
- Change nav label `Analytics` → `Insights`
- Change href `/admin/analytics` → `/admin/insights`
- Create `/admin/insights/page.tsx` as the AI intelligence hub:
  - Move `ClubIntelligenceWidget` (AI weekly summary + chat) from the dashboard page here
  - Add tabs or sections linking to existing chart pages (`/analytics/athletes`, `/analytics/programs`)
  - Placeholder section for nudges (Phase 2)

### 1b. Coach Insights page (new)
Route: `/clubs/[clubSlug]/coach/insights`

Sections:
1. **AI Summary** — Claude-generated weekly summary scoped to the coach's assigned groups only (streaming). Cached per-coach, refresh button. Uses new API: `POST /api/coach/ai/insights`
2. **Quick stats** — athlete count, waiver completion %, upcoming events in next 7 days, any outstanding payments — all scoped to coach's programs
3. **AI Q&A chat** — same tool-use loop as admin chat but queries filtered to `coach_id`'s groups. Uses new API: `POST /api/coach/ai/chat`
4. **Nudge cards** — placeholder for Phase 2

Add "Insights" nav item to coach sidebar (between Athletes and Messages).

### APIs needed for Phase 1
- `POST /api/coach/ai/insights` — generates/caches AI summary for coach (similar to admin insights but scoped)
- `GET /api/coach/ai/insights` — returns cached summary
- `POST /api/coach/ai/chat` — tool-use Q&A scoped to coach's assignments

---

## Phase 2 — AI Nudges

### How it works
1. **Signal detection** — DB queries find actionable conditions
2. **AI phrasing** — Claude writes each nudge as a concise, friendly action prompt (not just raw data)
3. **Pre-drafted email** — Claude generates a `body_template` with `{{ placeholder }}` fields specific to that signal
4. **User reviews → sends** — opens compose with template pre-filled; existing send API handles delivery

### Nudge signals

**Coach nudges** (scoped to their groups):
| Signal | Trigger condition |
|---|---|
| Unsigned waivers | Families with athletes in coach's groups who haven't signed a required waiver |
| Outstanding payments | Registrations with `payment_status = unpaid` > 7 days old |
| Upcoming event (48h) | Event in coach's groups starting within 48 hours |
| No recent messages | Coach hasn't sent a message to a group in > 14 days |
| Low attendance pattern | (future) Participation tracking signals |

**Admin nudges** (program/coach-level abstraction):
| Signal | Trigger condition |
|---|---|
| Low waiver completion by program | Program waiver rate < 60% (or below club average) |
| Coach hasn't messaged | Coach with active groups, 0 messages sent this season |
| Low enrollment | Program < 50% capacity filled |
| Payment failure cluster | > 3 failed payments in a program in last 7 days |

### AI-generated nudge format
Each nudge returned from the API:
```json
{
  "id": "unsigned-waivers-alpine-u14",
  "type": "unsigned_waivers",
  "title": "8 families haven't signed the season waiver",
  "detail": "These families in Alpine U14 still need to sign the 2025-26 Season Waiver before their athletes can participate.",
  "target": { "type": "group", "id": "...", "name": "Alpine U14" },
  "affected_families": [
    { "household_id": "...", "parent_first_name": "Sarah", "parent_last_name": "Smith", "athlete_first_name": "Emma", "athlete_last_name": "Smith" },
    ...
  ],
  "draft_subject": "Reminder: Season waiver for {{ athlete_first_name }} hasn't been signed",
  "draft_body": "Hi {{ parent_first_name }},\n\nJust a quick reminder that the 2025-26 Season Waiver for {{ athlete_first_name }} {{ athlete_last_name }} hasn't been signed yet.\n\nPlease sign it as soon as possible so {{ athlete_first_name }} can continue participating this season.\n\nIf you have any questions, don't hesitate to reach out.\n\n[Coach name]\n[Club name]",
  "recipient_count": 8
}
```

### Nudge UI
- Card with icon, AI-phrased title, detail line, recipient count badge
- **"Draft & Send" button** → opens review modal:
  - Template body shown with `{{ fields }}` highlighted in orange
  - Hover over any `{{ field }}` → tooltip shows first 3–4 real values (e.g. "Sarah, Mike, Anna +5 more")
  - Editable before sending
  - "Send to 8 families" button → calls existing `/api/messages/send` with `body_template`
- Nudge disappears automatically when underlying condition resolves (no manual dismiss needed)

### APIs needed for Phase 2
- `GET /api/coach/nudges` — returns AI-generated nudge list for the coach
- `GET /api/admin/nudges` — returns AI-generated nudge list for the admin (higher abstraction)

### Nudge resolution
Nudges are not stored — they are computed fresh on each page load. Once the condition is resolved (waiver signed, payment made) the nudge disappears automatically.

---

## Phase 3 — Personalized Send (merge fields)

### Changes to `/api/messages/send`
- Accept `body_template` alongside (or instead of) `body` — contains `{{ placeholder }}` syntax
- When `body_template` is provided, resolve per recipient:
  - `{{ parent_first_name }}` → guardian's first name
  - `{{ athlete_first_name }}` / `{{ athlete_last_name }}` → athlete name(s) for that household
  - `{{ athlete_names }}` → comma-joined names if multiple athletes per household
  - `{{ club_name }}` → club name
- Fallback: if a field can't be resolved, use a safe default (e.g. "there" for first name)
- One email per household (not per athlete)

### Merge field data
Already available from the send flow — guardians + household_ids are resolved. Need to also join athlete names per household. This is one additional query: `SELECT first_name, last_name FROM athletes WHERE household_id IN (...)`.

### Review UI (compose page extension)
When a nudge pre-fills the compose form:
- Body shows the template text
- `{{ placeholder }}` tokens rendered as `<span>` with orange tint + underline
- Hover tooltip shows resolved values for first 3 recipients
- Editable — coach can modify template before sending
- Subject line also supports placeholders

---

## File map

### New files
```
app/clubs/[clubSlug]/admin/insights/page.tsx          # Phase 1 — AI hub (replaces analytics landing)
app/clubs/[clubSlug]/coach/insights/page.tsx           # Phase 1 — coach AI hub
app/api/coach/ai/insights/route.ts                     # Phase 1 — GET cached / POST generate summary
app/api/coach/ai/chat/route.ts                         # Phase 1 — Q&A tool-use for coaches
app/api/coach/nudges/route.ts                          # Phase 2 — coach nudge signals + AI phrasing
app/api/admin/nudges/route.ts                          # Phase 2 — admin nudge signals + AI phrasing
```

### Modified files
```
components/admin-sidebar.tsx                           # Phase 1 — rename Analytics → Insights
components/coach-sidebar.tsx                           # Phase 1 — add Insights nav item
app/clubs/[clubSlug]/admin/page.tsx                    # Phase 1 — remove ClubIntelligenceWidget (moved to insights page)
app/api/messages/send/route.ts                         # Phase 3 — add body_template + merge field resolution
app/clubs/[clubSlug]/admin/messages/compose/page.tsx   # Phase 3 — merge field review UI
app/clubs/[clubSlug]/coach/messages/compose/page.tsx   # Phase 3 — merge field review UI
```

---

## What makes this meaningfully AI-powered

- **Summaries**: Claude reads structured club data and writes a human-readable weekly briefing (not just a dashboard)
- **Nudge phrasing**: Claude writes the nudge text — it's not "8 rows returned", it's a natural action prompt
- **Email drafts**: Claude writes the full `body_template` with placeholders, tailored to the signal type (waiver reminder vs payment reminder vs event reminder sound different)
- **Q&A**: Tool-use loop lets coaches ask natural language questions about their athletes, waivers, attendance
