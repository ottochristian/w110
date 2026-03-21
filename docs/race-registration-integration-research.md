# Race Registration Integration Research

*Last updated: 2026-03-21*

---

## Overview

Research into integrating w110 with external race registration platforms for ski racing (alpine focus, US market). Goal: allow coaches/admins to curate relevant races, and let parents/coaches sign up athletes with pre-filled data.

---

## Zone4

**What it is:** Canadian race timing and registration platform founded 2001. Based in Canmore, AB. Manages registrations for 1,000+ organizations. Primary platform for Canadian XC and alpine skiing; growing US presence.

**Sports covered:** XC skiing, alpine skiing, triathlon, running, mountain biking, snowboarding, biathlon.

**US alpine presence:** Used for some US events (e.g. Sun Valley JNQ). Not the dominant US platform.

### Registration Flow

Zone4 registration is simple and doesn't require account creation:
1. Event/race selection
2. Membership/licensing confirmation (auto-adds if needed)
3. Personal information form
4. Payment via Stripe
5. Confirmation email

**Fields collected:**
- Personal: first name, last name, DOB, gender, email, phone, address
- Racing: FIS license, USSA license, club, team, category/division
- Consent: waivers, photo permissions
- Preferences: dietary, volunteer, etc.

**Group/bulk registration:** Supported. Family/household can register multiple athletes in one transaction. CSV bulk upload also available (template download from admin panel).

### API / Integration

- **No public REST API**
- API access exists (Stripe/Helcim payment integrations, admin API config) but requires contacting Zone4
- CSV import/export available
- Contact: **support@zone4.ca**
- Ask: "Do you offer a partner API for programmatic race listing and registration submission?"

### Payment

- Uses **Stripe** (primary) and Helcim (alternative)
- Zone4 collects payment directly, remits to organizer after race
- Organizers connect their own Stripe account via Zone4 admin
- Pricing: 2.9% + $0.30 per transaction + $1.50 per registrant

### Timing

- GoChip wireless timing system ($2.75/weekend, $17/season)
- RapidCam photo finish
- Not yet FIS-certified as primary time source

---

## USSA / US Ski & Snowboard

**What it is:** US national governing body for alpine, XC, freestyle, ski jumping, Nordic combined, snowboard. Based in Park City, UT.

### API / Integration

- **No public REST API**
- No `/api`, `/developers`, or `/partners` pages
- Technical integration contact: **compservices@usskiandsnowboard.org**
- Access restricted to national ski associations, FIS officials, and approved timing vendors

### Race Calendar & Data

- Race calendar browsable at usskiandsnowboard.org/public-tools
- CSV export available (requires member account login)
- Some regional divisions maintain Google Sheets / Excel calendars (Northern Division, Region 3, Central Division)
- No machine-readable API endpoint

### Race Registration

USSA runs its own online athlete registration portal:
- URL: `my.usskiandsnowboard.org/aip/alpine/ussa-online-athlete-registration`
- Validates against FIS/USSA license database
- CSV export for race organizers (for import into timing software)
- Web portal only — no REST API

**Other platforms in use for US races:**
| Platform | Used By |
|---|---|
| Zone4 | Some US events, mostly Canadian |
| SkiReg | Some USSA regional races |
| AdminSkiRacing | Regional alpine races |
| Club websites | Many local/regional races |

### Athlete & License Data

- Member lookup: usskiandsnowboard.org/public-tools/members (web only)
- FIS points: fis-ski.com/DB/alpine-skiing/fis-points-lists.html (web only)
- FIS points list FTP file: `ftp://ftp.fisski.com/Software/Files/Fislist` (periodic updates — usable)
- Unofficial community REST API for FIS data: https://github.com/seanp2/ski-reference-backend (scraper-based, not production-safe)

### Results / Live Timing

- live-timing.com — primary results aggregator for USSA races
- livetiming.usskiandsnowboard.org
- vola.ussalivetiming.com
- All web-only, no structured data access

### Data Exchange Standards

USSA and FIS use **XML format** for timing/results data exchange. Timing vendors (Vola, Split Second) must comply with FIS XML specification. Not relevant for registration but relevant if results integration is ever considered.

---

## FIS (International Ski Federation)

- No public REST API
- Member portal restricted to national associations and officials
- FIS points list available via FTP (see above)
- XML protocol for race result submission (approved vendors only)
- Useful reference: [FIS Alpine Data-Software Booklet v1.13](https://assets.fis-ski.com/f/252177/8cc50a2939/20131210fis-alpine-data-software-booklet-28eng-29-v1-13.pdf)

---

## Summary: What's Actually Available Today

| Capability | Available? | How |
|---|---|---|
| Zone4 race list | No API | Manual curation or contact Zone4 |
| USSA race calendar | No API | CSV export (member login) or manual |
| Athlete license lookup | Web only | No programmatic access |
| FIS points | FTP file | Downloadable periodically |
| Results/timing | Web only | No structured access |
| Zone4 registration submission | Possible | Requires Zone4 API partnership |
| USSA registration submission | No | Web portal only |

---

## Design Thinking

### Core Problem

There is no single source of truth for US alpine ski races. Races run through Zone4, USSA's own portal, SkiReg, AdminSkiRacing, and club websites. A full auto-pull is not feasible without multiple platform partnerships.

### Recommended Approach

**The curation layer is the product.** Admin manually adds races to w110 (URL, date, title, eligible athletes). This handles Zone4, USSA, and off-platform races equally.

**The registration flow is where w110 adds value:**
1. Admin adds a race to w110, links athletes/programs to it
2. Coach/admin selects which athletes to enter (checkbox UI)
3. w110 pre-fills athlete data (name, DOB, club, USSA/FIS license)
4. Submits via:
   - **Level 1:** Deep link to Zone4/USSA with pre-filled query params (zero API needed)
   - **Level 2:** CSV download in Zone4/USSA format (feasible today)
   - **Level 3:** Programmatic API submission (requires Zone4/USSA partnership)

### Payment Options

| Option | Description | Feasibility |
|---|---|---|
| Parent pays Zone4 directly | w110 redirects to Zone4 checkout | Feasible now |
| w110 collects + remits | Take payment in w110 Stripe, forward to Zone4 | Requires Zone4 cooperation, complex |
| w110 convenience fee | Charge small fee in w110 before redirecting to Zone4 | Feasible, but UX friction |
| Full w110 payment | Zone4 exposes Stripe Payment Intent via API | Requires deep API partnership |

**Realistic starting point:** Redirect to Zone4/USSA for payment. Revisit payment ownership if API partnership is established.

### Race Weekend Multi-Event

Zone4 already supports multi-race weekends (e.g., Saturday vertical + Sunday vertical). The w110 UI should mirror this:
- Show race weekend as a single card
- Allow athlete-level checkboxes per individual race within the weekend
- Pre-fill once, submit for all selected races

---

## Next Steps

- [ ] Email Zone4: support@zone4.ca — ask about partner API
- [ ] Email USSA: compservices@usskiandsnowboard.org — ask about API access for approved platforms
- [ ] Design the manual race curation UI (admin adds race, links to programs/athletes)
- [ ] Design the athlete selection + submission UI (coach/parent checkbox flow)
- [ ] Decide on Level 1 (deep link) vs Level 2 (CSV) as v1 submission method
