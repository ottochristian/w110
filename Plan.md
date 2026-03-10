
0. Tiny Glossary (So the Jargon Isn’t Scary)
ORM (Object-Relational Mapper)
A library that lets you work with your database using code objects instead of writing raw SQL.
You can think: “Nice, I can say db.athletes.find() instead of writing SELECT * FROM athletes manually.”
Prisma
A popular ORM for TypeScript/Node. You describe your database tables in a Prisma schema file; Prisma generates types and helper functions.
It is not a database – it sits on top of one (like Supabase’s Postgres).
Supabase
A hosted Postgres database + Auth + storage + APIs.
You can use it:
Without Prisma (just Supabase JS client) – simplest.
Or with Prisma, pointing Prisma at the Supabase Postgres DB.
For you, to keep it simpler:
Decision:
Use Supabase’s Postgres + Supabase Auth + Supabase client.
Don’t worry about Prisma yet. We can add Prisma later if we want more advanced type safety.

1. Tech & Architecture Decisions
1.1 Chosen Stack
Frontend: Next.js (App Router) on Vercel
Language: TypeScript
UI: React + Tailwind CSS
Backend / Database: Supabase (Postgres)
Auth: Supabase Auth (email + password; potentially OAuth later)
Email: Resend (used for transactional emails in v1)
Payments: Stripe (program registration payments; “shop” support later)
File storage (waivers, logos): Supabase Storage
1.2 v1 vs Future Implementation Decisions
To keep v1 achievable but future-proof:
Waivers
v1: In-app waivers
Store waiver text in DB.
Show on signup/checkout.
Parent checks a box + types their name.
Save signature + timestamp per athlete/season.
Future: Docusign (or similar)
Add integration layer later.
Data model already has Waiver + WaiverSignature, so we can store external docusign_envelope_id when we add it.
Communications
v1 (Tier 1 features):
Only transactional emails via Resend:
Account verification / password reset.
Registration confirmation.
Payment receipt.
Waitlist promotion.
No SMS.
No bulk campaigns (no full “communication center” yet).
Future tiers:
Tier 2: bulk email campaigns, segment builder.
Tier 2/3: SMS notifications as add-on.
Race integrations
v1: No Zone4 / race API integration.
Just design the data model hooks (Race, RaceEntry) so we can plug API calls in later.
Future (Tier 3):
Zone4 integration (API keys per club).
Pull race calendars, push rosters.
Payments (Stripe)
v1:
Stripe Checkout or Payment Element for full payment at registration.
Store stripe_payment_intent_id / checkout_session_id on orders.
Simple refunds handled manually in Stripe dashboard.
Future:
Payment plans (monthly/quarterly).
“Shop” items (merch, extra fees) as additional OrderItems.

2. Product Scope (Recap, with v1 Scope Marked)
Roles:
Parent / Guardian
Club Admin
Coach (limited for v1)
Master Admin (you, managing all clubs)
Core concepts (for v1):
Club, Season, Sport, Program, Subprogram, Household, Guardian, Athlete, Registration, Order, Payment, Waiver, WaiverSignature.
Advanced concepts (later):
Groups, Race, RaceEntry, MessageCenter (bulk email/SMS), Calendar events, ActivityLog feed.

3. Minimal Data Model for MVP (What This Actually Means)
“Minimal data model for MVP” = the smallest set of tables we need in the database to support one complete end-to-end flow.
For you:
Parent logs in → sees club programs → registers athlete → pays → admin sees the registration & payment.
3.1 Must-have Tables for v1
(High level, you don’t need to remember every field name—just the concepts.)
users (Supabase Auth table + profile table)
id, email, name, role (parent, coach, admin, master_admin), etc.
clubs
id, name, slug, logo_url, primary_color, address.
seasons
id, club_id, name (2025/26), start_date, end_date, status (active, archived).
households
id, club_id, primary_guardian_id, address, phone, emergency_contact.
household_guardians
join table: household_id, user_id, is_primary.
athletes
id, household_id, first_name, last_name, dob, gender, medical_notes.
sports
id, club_id, season_id, name (Alpine, Nordic, etc.), status.
programs
id, sport_id, season_id, name (Devo, Prep), description, base_price, capacity, status.
subprograms
id, program_id, name (2x/week), price_delta or price, capacity, waitlist_enabled, status.
registrations
id, athlete_id, season_id, sport_id, program_id, subprogram_id, status (pending, confirmed, waitlisted, cancelled), price.
orders
id, household_id, total_amount, status (unpaid, paid, partially_paid, cancelled), created_at.
order_items
id, order_id, registration_id, description, amount.
payments
id, order_id, amount, method (stripe, cash, check), status, stripe_payment_intent_id.
waivers
id, club_id, season_id, title, body (text), required (bool).
waiver_signatures
id, waiver_id, athlete_id, guardian_id, signed_at, signed_name.
This is already enough to:
Show programs.
Let parents register athletes.
Create orders & payments.
Track who signed which waiver.
We don’t need yet (for v1): groups, race tables, activity logs, discount codes, full calendar.
We will design the DB so those tables can be added without breaking existing ones.

4. Minimal Route / Page List for MVP
“Route/page list for a small working slice” = which pages we actually build first so the app does something real.
4.1 Public & Parent Pages
/clubs/[clubSlug]
Club landing page (“Welcome to GTSSF Ski Admin portal”).
Buttons: “Log in”, “Create account”.
/clubs/[clubSlug]/signup
Form to:
Create guardian user.
Create household.
Create first athlete.
On success → parent dashboard.
/clubs/[clubSlug]/login
Login form (Supabase auth).
/clubs/[clubSlug]/parent/dashboard
Show:
Household info.
List of athletes.
Any active registrations.
/clubs/[clubSlug]/parent/athletes
List of athletes, button: “Add athlete”.
/clubs/[clubSlug]/parent/athletes/[athleteId]
Athlete detail & registrations.
/clubs/[clubSlug]/parent/programs
List Sports → Programs → Subprograms (even simple).
Button: “Register” (takes you to a simple “create registration” flow).
/clubs/[clubSlug]/parent/cart
Show pending registrations.
Checkout via Stripe.
On success: create order + payment, set registrations → confirmed.
/clubs/[clubSlug]/parent/billing
List orders + whether they’re paid.
4.2 Admin Pages
/clubs/[clubSlug]/admin/dashboard
Basic stats:
Registrations this season.
Total paid this season.
Athletes.
Simple list of latest registrations (very small initial “Recent Activity”).
/clubs/[clubSlug]/admin/programs
CRUD for sports/programs/subprograms.
/clubs/[clubSlug]/admin/households
List households, click through to see athletes & orders.
/clubs/[clubSlug]/admin/orders
List orders & payments.
With just these, you can:
Configure programs → parent signs up → parent registers → pays → admin sees.
Everything else (coach portal, communications center, calendar, race integrations) can be layered on afterwards.

5. Checklist for Auth, DB, and Deployment Basics
This is just “what has to be done to make the app actually run on Vercel + Supabase”.
5.1 Supabase Setup
 Create a Supabase project.
 In Supabase:
 Enable email/password auth.
 Set up the database tables above (we can later generate SQL or use the UI).
 Generate a service role key (for server-side database operations).
 Get Supabase URL + anon key.
Vercel env variables to add:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
5.2 Next.js + Vercel Setup
 Create Next.js app (TypeScript + Tailwind).
 Install Supabase JS client, Resend, Stripe.
 Add environment variables in Vercel:
Supabase vars above.
Resend API key.
Stripe publishable + secret keys.
 Create a shared supabaseClient helper for:
Browser / client-side use (public).
Server-side use (using service role key when needed).
5.3 Auth Wiring
 Use Supabase Auth for:
Sign up / sign in pages.
Session management in Next.js (Supabase client in server components or API routes).
 On user creation:
Create profile row in users table with a default role (parent).
 Implement middleware:
/parent/** routes require role parent.
/admin/** routes require role admin or master_admin.
5.4 Stripe & Resend Wiring
 Connect Stripe (test mode at first).
Create a checkout session for the order total.
On success webhook → update payments + orders.
 Resend:
Simple email send function (server-side) for:
Registration confirmation.
Payment receipt.

6. Layout & Design Direction
You want: modern, intuitive, good-looking.
Let’s give this to “future dev/designer Jen” as a mini design brief.
6.1 Overall Design Principles
Intuitive > fancy.
Parents should never wonder “Where do I click now?”
Clear step-by-step flows: breadcrumbs, progress indicators (e.g., “1. Programs → 2. Cart → 3. Payment”).
Consistency.
Use a small set of reusable components (Button, Card, Input, Table, Badge).
Legible & clean.
Plenty of white space.
Clear hierarchy (big heading, medium subheading, normal text).
Mobile-friendly.
Parents might register on phones.
Accessible.
High contrast.
Labels for all inputs.
Key flows usable via keyboard.
6.2 Visual Style
Font: System font stack or something like Inter.
Color scheme:
Neutral background (slate / zinc).
Accent color per club (from club.primary_color).
Danger colors for alerts (red).
Components:
Rounded cards with soft shadows.
Clear primary buttons; subtle secondary buttons.
6.3 Layout
Top-level layout:
Club-specific header with logo + user avatar.
Parent portal:
Simple top nav: Dashboard | Athletes | Programs | Billing | Profile.
Admin portal:
Sidebar nav:
Dashboard
Programs
Households
Orders
Settings (later)
Tailwind CSS:
Used to implement all spacing, typography and colors.
E.g., className="flex flex-col gap-4 p-6" type patterns.
You don’t need to know Tailwind deeply—just that it gives devs a fast way to build consistent UI with small utility classes.

7. GitHub Milestones & Issue List (Detailed)
You can copy-paste this into GitHub as milestones and issues.
Milestone 0 – Project & Infra Setup
Issue 0.1 – Create Next.js project & connect to Vercel
Create new Next.js app (create-next-app) with TypeScript and Tailwind.
Push to GitHub.
Connect repo to Vercel.
Confirm automatic deploys on push.
Issue 0.2 – Configure Tailwind CSS
Install Tailwind.
Configure base styles in globals.css.
Create basic layout component with a header and blank content area.
Issue 0.3 – Create Supabase project & env variables
Create Supabase project.
Enable email/password auth.
Copy Supabase URL and anon key into .env.local and Vercel env.
Add service role key to Vercel (server only).

Milestone 1 – Database Schema & Supabase Integration
Issue 1.1 – Define core tables in Supabase
Create tables:
users (profile table, not Supabase auth table)
clubs
seasons
households
household_guardians
athletes
sports
programs
subprograms
registrations
orders
order_items
payments
waivers
waiver_signatures
Add foreign keys and sensible indexes.
Issue 1.2 – Seed data for dev
Create SQL or a script to insert:
One test club.
One active season.
A few sports/programs/subprograms.
Issue 1.3 – Supabase client helpers
Create reusable Supabase client functions:
For server (using service key).
For client (using anon key).
Document how to use them in Next.js components.

Milestone 2 – Auth & User/Role Model
Issue 2.1 – Parent signup & login using Supabase Auth
Build /clubs/[clubSlug]/signup using Supabase Auth email/password.
On signup success:
Create profile in users table with role parent.
Build /clubs/[clubSlug]/login to sign in via Supabase.
Issue 2.2 – Role-based routing & protection
Implement middleware to:
Redirect unauthenticated users to login.
Ensure /admin/** is only accessible to users with admin or master_admin role.
Ensure /parent/** is accessible to parent role.
Issue 2.3 – Assign admin role manually (bootstrap)
For now, manually update one user in DB to admin role for testing admin portal.

Milestone 3 – Admin: Club, Season, and Program Setup
Issue 3.1 – Admin Dashboard (very basic)
Create /clubs/[clubSlug]/admin/dashboard.
Show:
Number of athletes.
Number of registrations this season.
Total “paid” revenue this season.
Add dummy “Recent Activity” list using the last 5 registrations.
Issue 3.2 – Programs management page
Create /clubs/[clubSlug]/admin/programs.
List sports with their programs & subprograms.
Allow admin to:
Add/edit/delete sports.
Add/edit/delete programs.
Add/edit/delete subprograms.
Respect status field (active/inactive).
Issue 3.3 – Admin households & orders pages (basic)
/clubs/[clubSlug]/admin/households:
List households with number of athletes.
/clubs/[clubSlug]/admin/orders:
List orders with amount and status.

Milestone 4 – Parent Portal: Household & Athletes
Issue 4.1 – Parent dashboard
/clubs/[clubSlug]/parent/dashboard:
Show household name, number of athletes.
Show summary of current season registrations.
Issue 4.2 – Athletes list & detail
/clubs/[clubSlug]/parent/athletes:
List athletes with “Add athlete” button.
/clubs/[clubSlug]/parent/athletes/[athleteId]:
Show athlete profile, list of registrations.
Issue 4.3 – Waiver display & signature
Show season waiver on:
Signup flow (if required).
Prior to checkout.
Implement in-app waiver:
Checkbox “I agree”, text field for typed name.
Save waiver_signatures row.

Milestone 5 – Registration Flow, Cart & Checkout
Issue 5.1 – Parent program listing page
/clubs/[clubSlug]/parent/programs:
Show sports → programs → subprograms.
Each subprogram displays price & capacity.
“Register” button → choose athlete.
Issue 5.2 – Create registrations & cart
When parent selects athlete + subprogram:
Create registrations row with status pending.
Add entry to in-memory or DB-backed “cart”.
/clubs/[clubSlug]/parent/cart:
List pending registrations with price per item and total.
Issue 5.3 – Stripe checkout integration (v1)
From cart:
Create order and order_items with status unpaid.
Create Stripe Checkout session for order total.
Redirect to Stripe.
Implement Stripe webhook endpoint:
On success:
Mark payments row as succeeded.
Update order status → paid.
Update registrations → confirmed.
Issue 5.4 – Parent billing page
/clubs/[clubSlug]/parent/billing:
List all orders for the household, show paid/unpaid.

Milestone 6 – Transactional Email via Resend
Issue 6.1 – Resend integration
Add server-side helper to send emails via Resend.
Issue 6.2 – Registration confirmation email
On registration + payment success:
Send email to all guardians of the household summarizing:
Athletes.
Programs.
Amount paid.
Issue 6.3 – Payment receipt email
On any successful payment:
Send receipt email via Resend.

Milestone 7 – UX Polish & Dashboard 1.1
Issue 7.1 – Tailwind-based layout & components
Implement shared layout with:
Header, sidebar (for admins).
Simple logo + club name.
Build reusable components:
<Button>, <Card>, <Input>, <Table>, <Badge>.
Issue 7.2 – Improve Admin Dashboard metrics & activity
Refine /admin/dashboard to include:
Revenue to date vs last season (simple bar comparison).
Registrations by sport (simple counts).
Top 3 programs by % capacity.
Recent activity (last 10 registrations and orders).
Issue 7.3 – Error & loading states
Add loading spinners on data fetches.
Show friendly messages when lists are empty (e.g., “No programs yet”).




1. Core Concepts (Domain Model Mental Model)
These drive everything else:
Season
id, club_id, name (“2025–2026”), start_date, end_date, is_current, status
Most data is season-scoped: sports, programs, subprograms, rosters, waivers, discount codes.
Club (Sport Club)
id, name, logo_url, primary_color, address, timezone, signup_open, contact_email
One club can offer multiple sports & seasons.
Sport
id, club_id, season_id, name (Alpine, Freeride, Nordic),
status: active/inactive/archived/deleted.
Program
id, sport_id, season_id, name (Devo, Prep, HS), description, age_range, ability_level
base_price, capacity, status.
Additional flags: visible_to_parents, requires_approval, registration_open/close date.
Subprogram
id, program_id, name (“2 days/week”, “3 days/week”, “First half”, “Summer”),
price_delta, capacity, waitlist_enabled, status.
Group (optional for v1, but you’ve already used this concept)
id, subprogram_id, name (Group A, U12 Training Group), coach_id, capacity.
Household / Family
id, club_id, primary_email, phone, address, emergency_contact,
Multiple Guardians (Parents) belong here.
User / Guardian (Parent)
id, auth_user_id, name, email, phone, role: parent/coach/admin/master_admin.
Linked to household(s) via HouseholdGuardian join table.
Athlete
id, household_id, name, dob, gender, medical_notes, allergies,
Optional: membership IDs (USSS, etc.), notes, photo.
Season-local status: active/inactive/archived/deleted.
Registration
id, athlete_id, season_id, sport_id, program_id, subprogram_id,
status: pending/confirmed/waitlisted/cancelled, price, discount_applied, payment_plan_id.
Order / Invoice
id, household_id, total_amount, status: unpaid/partially_paid/paid/refunded,
line_items referencing registrations, fees, discounts, etc.
Payment methods: credit card (Stripe), offline notes for cash/check.
Payment
id, order_id, amount, method, timestamp, status, processor_id.
DiscountCode
code, description, amount_off or %_off, max_uses, per_household_limit,
valid_from/to, applies_to (sport/program/subprogram/season), status.
Waiver / Document
id, club_id, season_id, title, body or docusign_template_id, required_for_registration.
AthleteWaiverSignature tracks athlete + guardian + timestamp.
Event / CalendarItem
id, club_id, season_id, title, type: practice/race/meeting/camp,
start/end, location, assigned_sports/programs/subprograms/coaches.
Race / ExternalEvent
id, club_id, external_provider (Zone4), external_id, date, location, link,
mapped_categories, status.
RaceEntry: athlete + race + category.
Message / Communication
id, club_id, sender_user_id, subject, body, channel: email/sms/in-app,
target_segment (filters), status, sent_at.
MessageRecipient with delivery status per guardian.
Assignments
CoachAssignment: coach to sport/program/subprogram/group for a season.
RoleAssignment: user to role (coach/admin) + club.

2. App Structure by Role & Page
2.1 Public & Club-Level Pages (Pre-login)
2.1.1 Multi-Club Landing (Optional for v1, but aligns with SaaS)
Purpose: Entry point for clubs & parents.
URL: /
Primary users: Parents, club admins (marketing page)
Key content:
Hero + explanation of Ski Admin.
“Find my club” search by club name / zip.
“Club admin? Start here” leading to club signup/contact.
Key actions:
Parents: choose their club → redirect to /clubs/:clubSlug.
Club admins: contact form / request demo.
2.1.2 Club Landing / Informational Page
Purpose: Club-branded entry point for families.
URL: /clubs/:clubSlug
Key content:
Club logo, colors, intro text, contact info.
Links: “Register / Log In”, “Programs & Pricing”, “Calendar” (public view).
Key actions:
Register / log in to parent portal.
Browse programs by sport.

2.2 Auth & Onboarding
2.2.1 Parent Sign Up
URL: /clubs/:clubSlug/signup
Functionality:
Create guardian account and initial household in one flow.
Steps:
Account: Email, password, name, phone, consent to terms/privacy.
Household: Address, emergency contact, additional guardian (optional).
First Athlete: Name, DOB, gender, medical/allergy info.
Club Waiver: Show relevant season waiver; require signature (check + type name + date; or redirect to DocuSign).
After completion: redirect to Parent Dashboard (with outstanding items if any).
2.2.2 Login / Forgot Password
URL: /login, club-aware or multi-club.
Simple auth, with role-based redirect:
Parent → Parent Dashboard.
Coach → Coach Dashboard.
Admin → Admin Dashboard.
Forgot password flow via email.

3. Parent / Household Portal
3.1 Parent Dashboard
URL: /clubs/:clubSlug/parent/dashboard
Purpose: Single place to see “what do I need to do?”
Widgets:
Current season summary:
Athletes and their enrolled programs.
Outstanding actions: missing waivers, unpaid balances, incomplete registrations, missing profiles.
Next upcoming practices/races for their athletes (calendar snippet).
Quick actions:
“Add athlete”
“Register for a program”
“View balance / make payment”
3.2 Household Profile
URL: /clubs/:clubSlug/parent/household
Functionality:
Edit household details:
Address, phone, emergency contacts.
Email preferences (email vs SMS where supported).
Manage guardians:
Add 2nd parent, edit their contact info.
Set primary contact.
Communication/Notification settings:
Subscribe/unsubscribe to newsletter, race updates, etc.
3.3 Athlete List & Profile
URL:
List: /clubs/:clubSlug/parent/athletes
Detail: /clubs/:clubSlug/parent/athletes/:athleteId
List page:
Cards/table of athletes with:
Name, age (derived), current season programs, status.
Quick links to “Register”, “View schedule”, “Edit profile”.
Detail page:
Tabs:
Profile: DOB, medical notes, membership IDs, equipment notes.
Registrations: list of seasons + programs; status (confirmed/waitlisted).
Documents: Waivers status for this athlete; re-sign if new season.
Races (v2): upcoming and past races for this athlete.
3.4 Browse Programs & Program Details
URL: /clubs/:clubSlug/parent/programs & /clubs/:clubSlug/parent/programs/:programId
Browse page:
Filters:
Season, Sport, Age (auto derived from DOB if logged in), Days/week, Price range.
Cards showing each Program + its Subprograms:
Age range, ability description, typical schedule.
Spots left vs total; “Waitlist only” if capacity filled.
Price for common subprograms (“from $X”).
Program detail page:
Breakdown:
Description, requirements, what’s included.
Table of Subprograms with:
Name, schedule (2x/week etc.), price, capacity, current count, waitlist status.
“Select athlete(s)” modal:
For each athlete in household, show age eligibility and whether they already registered.
CTA: “Add to cart” or “Join waitlist”.
3.5 Cart & Checkout
URL: /clubs/:clubSlug/parent/cart
Functionality:
Shows all selected registrations:
Athlete, program, subprogram, base price, discounts, total.
Apply discount code:
Validate, show error states, show new totals.
Payment options:
Pay in full, or choose pre-defined payment plan (monthly/quarterly) if allowed by club for that program.
Show summary: amount due today vs scheduled later payments.
Payment methods:
Credit card (Stripe) with stored payment method option.
Option to choose “Pay by cash/check” if club allows:
Show instructions and mark order as pending/offline.
On successful payment:
Create Order, Payments, and mark Registrations confirmed.
Send confirmation email to all guardians in household.
3.6 Orders & Payment History
URL: /clubs/:clubSlug/parent/billing
Functionality:
List of orders:
Date, amount, status, link to invoice.
Each order detail:
Line items: registrations, fees, discounts.
Payment history (partial payments, refunds).
Button: “Pay remaining balance” (if not fully paid).
3.7 Waivers & Documents
URL: /clubs/:clubSlug/parent/documents
Functionality:
For each season & athlete:
Show required club waivers and status (signed/unsigned/expired).
Click to sign:
In-app signature or DocuSign handoff.
Show past signed waivers as view-only.
3.8 Calendar View for Parents
URL: /clubs/:clubSlug/parent/calendar
Functionality:
Filter toggles:
Per athlete, sport, program, subprogram.
Views:
Agenda + monthly calendar of practices, races, events.
Integration:
ICS feed link: “Subscribe to your household calendar”.
3.9 Messages / Inbox (Simple v1)
URL: /clubs/:clubSlug/parent/messages
Functionality:
List of messages sent to this household / guardians.
Each message shows subject, sent date, content; some may link to events (e.g., race info).

4. Club Admin Portal
Top-level navigation roughly:
Dashboard
Setup (Club Settings, Seasons, Waivers, Payment & Email settings)
People (Households, Athletes, Coaches, Admins)
Programs (Sports, Programs, Subprograms, Capacity/Waitlists)
Registrations & Orders
Communication
Calendar & Races
Reports
4.1 Admin Dashboard (Updated Spec)
URL:
/clubs/:clubSlug/admin/dashboard
Purpose:
Give a quick, at-a-glance overview of how the club is doing right now – financially, in registrations, capacity, and operationally – plus a digest of what’s recently happened and anything that needs attention.

A. Page Layout (High-Level)
Think of the dashboard as a set of cards/sections:
Header bar
Key Metrics row (cards)
Charts row
Capacity & Waitlists
Recent Activity feed
Alerts / To-Dos
On desktop, you can do a 2-column layout below the hero metrics; on mobile, these just stack.

B. Header Bar
Contents:
Club name + logo
Current season selector (dropdown):
Default: current active season.
Options: all seasons (but dashboard metrics are always scoped by the selected season).
Subscription tier indicator (nice but optional):
e.g., “Plan: Core Registration / Communication & Ops / Race & Performance”.
Link to “Manage plan” (SaaS-level, if you want).

C. Key Metric Cards (Top Row)
A row of 3–4 cards for the most important numbers, all scoped to the selected season:
Revenue to Date
Value: total paid for this season.
Subtext: “vs last season: +12%” (if previous season exists).
Registrations
Value: total confirmed registrations.
Subtext: “by X athletes across Y programs”.
Click → /admin/registrations filtered to current season.
Households with Outstanding Balances
Value: number of households with unpaid balance.
Subtext: “Total overdue: $X”.
Click → /admin/orders?filter=overdue.
Waitlisted Athletes
Value: count of waitlisted registrations.
Subtext: maybe “across Z programs”.
Click → /admin/registrations?status=waitlisted.
You can vary this by tier later (e.g., add “Messages sent this week” or “Race entries this season” for higher tiers), but these are the core four.

D. Charts Row
Two main widgets, side-by-side on desktop:
Revenue vs Last Season (Chart)
Type: line or bar chart.
X-axis: time (weeks or months).
Y-axis: revenue.
Two series:
Current season
Previous season (if exists).
Purpose: “Are we ahead or behind where we were last year?”
Registrations by Sport/Program (Chart)
Type: bar or stacked bar.
X-axis: sports (Alpine, Freeride, etc.).
Y-axis: number of registrations.
Optionally drilldown on hover or click:
see breakdown by programs or subprograms.
Purpose: “Where is demand going?”

E. Capacity & Waitlists (Top 5 Programs)
Card title: “Capacity & Waitlists”
Content:
Table of top 5 programs/subprograms by demand, sorted by either:
highest % full, or
largest waitlist.
Columns:
Program / Subprogram name
Sport
Capacity
Enrolled (confirmed regs)
% Full
Waitlisted count (if any)
Indicator pill:
Green: <80% full
Yellow: 80–99% full
Red: full + waitlist
Interactions:
Click a row → goes to that program/subprogram detail in /admin/programs or similar, where admin can:
Increase capacity.
Adjust waitlist behavior.
See full roster.
This directly covers your:
“Registrations count by sport/program”
“Capacity & waitlists (top 5 programs by demand)”
The aggregate chart in section D handles the overall counts by sport; this card is the “actionable” capacity view.

F. Recent Activity (New Widget)
Card title: “Recent Activity”
Purpose: Show what’s been happening without making the admin hunt in multiple pages.
Controls:
Filter dropdown:
“Last 24 hours”
“Last 7 days” (default)
“Last 30 days”
Optional filter by type:
All / Registrations / Payments / Communications / Race
Entries:
Each line is a human-readable event with timestamp and type icon:
2 hours ago – New registration: Alice Smith → Alpine Devo 3x/week (2025/26).
Yesterday – Payment received: $450 from Rogers Household (Order #1234).
2 days ago – Waitlist promotion: Ben Miller moved from waitlist to Alpine Prep 2x/week.
3 days ago – Message sent: “Welcome to the season” to 132 guardians.
4 days ago – Race entries pushed: 18 athletes registered for “Targhee GS #1” (Zone4).
Click behavior:
Click → go to relevant detail page:
registration, order, message, race, etc.
Tier-aware:
Tier 1: shows items like registrations, orders, waivers, households.
Tier 2: adds communication events (messages sent, SMS batches).
Tier 3: adds race events (rosters pushed, entries updated).

G. Alerts / To-Dos
Card title: “Alerts” or “Things to Fix”
This is not a log; it’s a list of current problems or required actions.
Examples of alert rules:
Setup alerts
“Payment provider not connected – parents can’t pay online.”
“No waiver configured for 2025/26 – registrations will be blocked.”
Time-sensitive alerts
“Registration for Alpine Devo closes in 3 days (23 athletes registered).”
“Season 2025/26 has started but no programs are active.”
Operations alerts
“12 households have overdue balances totaling $3,200.”
“Freeride Prep is full with 10 athletes on waitlist – consider adding capacity or group.”
Integration alerts (higher tiers)
“Zone4 integration error: last roster push failed.”
UI:
Each alert has:
Severity (icon + color: error / warning / info).
Short description.
CTA link (“Configure payment”, “Create waiver”, “View overdue households”, “Review waitlist”).
Option to mark some alerts as dismissed for this admin/session (for non-critical ones).

H. Tier-Specific Enhancements (Optional)
You can keep the overall layout the same across tiers, just add more cards/metrics for bigger plans:
Tier 2 (Communication & Ops):
Add a small card in metrics row:
“Messages sent this week: 5 (3 email, 2 SMS)”
In Recent Activity: show message-sent events.
In Alerts: “Email sending failed for last campaign” or “You’ve used 80% of your SMS quota”.
Tier 3 (Race & Performance):
Add a card:
“Race entries this season: 87 athletes / 14 races”
In charts row (later v2): a small chart of race participation across programs.
In Recent Activity / Alerts: integration health and push events.
4.2 Club Setup
4.2.1 Club Settings
URL: /clubs/:clubSlug/admin/settings/club
Edit club name, logo, colors.
Address, timezone, contact info, default reply-to email.
Registration settings:
Whether to allow offline payments.
Whether to allow parent-created accounts or invite-only.
4.2.2 Seasons Management
URL: /clubs/:clubSlug/admin/settings/seasons
List seasons with:
Name, start/end dates, status (draft/active/archived).
Actions:
Create new season:
Option to “clone from” previous season (sports, programs, subprograms, waivers, discount codes).
Set current active season used by default in all filters.
Archive season (soft delete / read-only).
4.2.3 Waivers & Documents
URL: /clubs/:clubSlug/admin/settings/waivers
For each season:
Create/edit waiver templates for:
General club waiver.
Sport-specific waivers (e.g., race waivers).
Choose signature mechanism:
In-app signature.
DocuSign template ID + redirect callback URL.
Preview how parents see them.
4.2.4 Payment & Email Settings
URL: /clubs/:clubSlug/admin/settings/integrations
Connect payment provider (Stripe keys).
Connect email provider (SendGrid, etc.) or use Ski Admin’s default.
SMS integration toggle (future; Twilio or similar).
Race provider integration:
Zone4 API key, token, mapping settings.
4.3 People Management
4.3.1 Households
URL: /clubs/:clubSlug/admin/households
Search by parent name, email, athlete name.
List with columns:
Household name (maybe primary guardian), #athletes, balance due, status.
Detail view:
Guardians, contact info.
Athletes list with quick links.
Orders & outstanding balances.
Notes.
Impersonate login (admin-only tool, optional).
4.3.2 Athletes
URL: /clubs/:clubSlug/admin/athletes
Filters:
Season, Sport, Program, Subprogram, status.
List view:
Name, age, household, registered programs.
Bulk actions:
Change subprogram, mark as inactive/archived.
Export CSV for rosters or timing.
4.3.3 Coaches
URL: /clubs/:clubSlug/admin/coaches
Manage coach user accounts:
Name, email, phone, status.
Assignments:
Sports/programs/subprograms/groups per season.
Permissions:
Head coach vs coach (head can modify programs; coach cannot).
4.3.4 Admin Users
URL: /clubs/:clubSlug/admin/staff
Manage club-level admins:
Name, email, role (full admin vs finance-only etc.).
4.4 Programs & Capacity
4.4.1 Sports Management
URL: /clubs/:clubSlug/admin/sports
CRUD for sports within a season.
Set status: active/inactive/archived/deleted (soft delete).
Toggle visibility to parents.
4.4.2 Programs & Subprograms
URL: /clubs/:clubSlug/admin/programs
Tree view: Sport → Programs → Subprograms.
For each program:
Name, age range, ability level, base price, typical schedule text.
Assign default head coach.
Status & visibility.
For each subprogram:
Name (2x/week, 3x/week, etc.).
Price delta or final price.
Capacity & current count.
Waitlist toggle and limit (optional).
Registration open/close dates.
Actions:
Create new, clone from previous season.
Soft delete (status → deleted) instead of hard delete.
Archive to hide from parents but keep history.
4.4.3 Groups (Within Subprograms)
URL: /clubs/:clubSlug/admin/groups
For each subprogram, define groups:
Group name, coach, capacity.
Move athletes between groups (drag & drop UI later; simple dropdown v1).
Export group rosters.
4.5 Registrations & Orders
4.5.1 Registrations Overview
URL: /clubs/:clubSlug/admin/registrations
Filter by:
Season, Sport, Program, Subprogram, registration status.
Show each registration:
Athlete, program, status (confirmed/waitlisted), price, payment status (linked to order).
Actions:
Approve/decline pending registrations (if program requires manual approval).
Promote from waitlist when capacity opens:
Choose whether to auto-create order or send email asking parent to confirm & pay.
4.5.2 Orders & Payments
URL: /clubs/:clubSlug/admin/orders
List orders:
Household, total, status, outstanding, creation date.
Order detail:
Line items (program registrations, fees, discounts).
Payment history with links to processor.
Manual adjustments:
Add credit, add fee, adjust line item amount.
Mark offline payments (cash/check).
Filter by date range, payment status.
4.6 Discount Codes
URL: /clubs/:clubSlug/admin/discounts
Create/edit discount codes:
Code, description, type (amount or %), stackable or not.
Valid date range.
Applies to: whole cart, specific sports/programs/subprograms.
Max uses overall and per household.
Activity: list of redemptions.
4.7 Communication Center
URL: /clubs/:clubSlug/admin/communications
Segment builder:
Conditions:
Role (parent, coach, admin),
Season,
Sport/program/subprogram,
Registration status (waitlisted, confirmed),
Athlete age/grade (derived),
Household balance (has unpaid balance).
Build and save segments (e.g., “All Alpine Devo parents 2025/26”).
Message composer:
Subject, body (HTML editor), attachments (e.g., PDF info).
Choose channel: email (v1), email+SMS (v2).
Preview and send test to admin email.
Send & log:
Show counts, delivery statuses where available.
4.8 Calendar & Races
4.8.1 Calendar Admin
URL: /clubs/:clubSlug/admin/calendar
Create & manage events:
Type (practice, race, camp, meeting),
Date/time, location, description.
Assign to sports/programs/subprograms/groups & coaches.
Parents see only events relevant to their athletes.
4.8.2 Race Integration (Zone4, etc.)
URL: /clubs/:clubSlug/admin/races
Integration section:
Test connection to Zone4 (or similar).
Pull in list of races for the season.
For each race:
see details (date, venue, categories).
Map categories to club programs or age groups.
Build roster:
Filter athletes by program, age, ability.
Select and assign race categories.
Push entries via API to Zone4.
Track race entries:
View which athletes are registered for which races.
4.9 Reports
URL: /clubs/:clubSlug/admin/reports
Predefined reports:
Registrations by sport/program/subprogram.
Revenue by season, by program.
Waitlist stats.
Attrition (who didn’t return from previous season).
Export CSV for all.

5. Coach Portal
5.1 Coach Dashboard
URL: /clubs/:clubSlug/coach/dashboard
Contents:
“Today’s” schedule: practices & races the coach is assigned to.
One-click links:
View roster for each session.
Record attendance (v2).
Notifications:
New athletes added to their group.
Messages from admin.
5.2 Coach Rosters
URL: /clubs/:clubSlug/coach/rosters
Filter by season, sport, program, subprogram, group.
List of athletes with basic info:
Name, age, emergency contact, important medical flags (non-editable but visible).
Actions:
(If head coach) move athlete between groups within program.
Export roster to CSV/print.
5.3 Practice Scheduling (v2)
URL: /clubs/:clubSlug/coach/practices
Coaches can create recurring practices (if permitted by admin):
Date/time, location, notes.
Assign to their existing programs/subprograms.
Admin can review/override overall.
5.4 Race Management (Coach View)
URL: /clubs/:clubSlug/coach/races
Show upcoming races from Race Integration:
For each, indicate which of their athletes are entered.
If permitted:
Suggest or request entries for athletes (admin approval).
5.5 Coach Messaging (Scoped)
URL: /clubs/:clubSlug/coach/messages
Limited version of communication center:
Segment automatically limited to athletes/households in their assigned programs/groups.
Compose email to their groups.
View sent messages.

6. Master Admin (SaaS-Level)
This is you managing the overall Ski Admin system.
6.1 SaaS Dashboard
List all clubs:
Name, active seasons, #athletes, last activity, status.
See subscription status (if/when you charge clubs later).
6.2 Club Management
Create and onboard new clubs.
Impersonate club admins for support.
Global feature flags (enable/disable race integration, SMS, etc.).

7. Statuses & Soft-Delete Strategy
Apply consistent status pattern:
Sports / Programs / Subprograms / Users / Athletes / Coaches:
active – currently in use / visible.
inactive – hidden from new registrations but still accessible internally.
archived – read-only, used for past seasons; not modifiable except by master admin.
deleted – soft-deleted; hidden from UI, but kept for referential integrity.
Behavior examples:
Parents only see active + visible programs in current season.
Admins can filter by status.
Deleting a program sets:
Program → deleted,
Its subprograms/groups → deleted,
Registrations remain but clearly marked as belonging to deleted program.

8. Waiting List Behavior
Per Subprogram (or Program if no subprograms):
Capacity integer, waitlist_enabled boolean.
When capacity reached:
Parent can join waitlist instead of register.
Registration created with status = waitlisted and no active order line item yet, or a zero-dollar placeholder.
Admin can:
Promote from waitlist:
System prompts to create an Order & send payment link.
Or auto-promote + auto-charge if payment method on file (future).

9. Email & SMS Behavior
All messages target guardians at the Household level, not just the “account owner”.
When sending to a segment of athletes/registrations:
System resolves to all linked households and guardians, deduped.
Important transactional emails:
Registration confirmation.
Payment receipts.
Waitlist promotion.
Race entry confirmation.
Waiver reminder.

10. Subscription Tiers & Feature Gating
Think of tiers as per-club subscriptions (SaaS), with feature flags you can flip on/off in the backend.
10.1 Tier Overview (Recommended)
Tier 1 – Core Registration
“Just let us sign kids up and take payments.”
Tier 2 – Communication & Operations
“We want to manage all our people and communication through this system.”
Tier 3 – Race & Performance
“We’re a race-heavy, performance-focused club and want deep integrations + advanced tools.”
You can always add usage-based pricing (e.g., per SMS, per athlete) on top.

10.2 Tier 1 – Core Registration
Target clubs: Small to mid-size clubs, maybe volunteer-run, who need a clean registration flow and basic admin management but don’t want to overhaul operations yet.
Key features:
Multi-club, multi-season structure
Club onboarding.
Seasons with cloning from previous year.
Program hierarchy & capacities
Sports, programs, subprograms.
Status: active/inactive/archived/deleted.
Capacity + waitlists.
Parent & household portal
Sign up, login, manage household + athletes.
Browse programs, add to cart.
Registrations, cart & checkout
Registrations (including waitlist).
Orders, payments via credit card.
Optional offline payments (cash/check) if allowed.
Waivers
In-app waivers.
Simple support for DocuSign redirection (no fancy integration required yet).
Admin basics
Admin dashboard (v1: key counts & totals).
People management: households, athletes, coaches, admins.
Program management UI.
Orders & payments views.
Basic CSV export (rosters, registrations).
Transactional email only
System-critical emails:
Account signup / password reset.
Registration confirmation, payment receipts.
Waitlist promotion.
Waiver reminders.
No bulk email / campaigns / newsletters in this tier.
SMS not included, even for transactional.
Upsell angle: Many clubs will quickly feel the pain of “We still have to use MailChimp / Gmail for all our communication.” That’s your natural upgrade path to Tier 2.

10.3 Tier 2 – Communication & Operations
Target clubs: Clubs who are past “just signups” and want a central place to communicate and run operations.
This tier includes everything in Tier 1 plus:
10.3.1 Communication Center (Unlocked)
Bulk email campaigns & segments
Build segments (by sport, program, subprogram, season, registration status, etc.).
Save segments (e.g., “Alpine Devo parents 25/26”).
Compose & send email to those segments.
View basic delivery summary (sent, bounced if possible).
Coach messaging
Coaches can send email to their assigned groups/programs (within limits).
Templates
Club-level email templates: “Welcome to the season”, “Race week info”, etc.
10.3.2 SMS (Optional Usage Fees)
Transactional + bulk SMS (configurable by club):
Practice cancellations, race-day notices, “bus leaving late” type stuff.
Controls:
Opt-in/opt-out per guardian.
Hard limit on SMS volume, with warnings to avoid surprise bills.
Pricing:
Either:
Include X SMS/month in Tier 2 and charge overage, or
Make SMS a paid add-on to Tier 2 & 3.
10.3.3 Operations Enhancements
richer Calendar experience:
Admin & coach-created events, pushed to parent calendars.
More reporting
Simple attendance or export scaffolding.
Possibly: coach tools like simple attendance tracking (v2) – nice mid-tier features.
Upsell angle: In-app “locked” icons / tooltips:
“Send this announcement to all Alpine Devo parents via email & SMS – available on the Communication & Operations plan. Upgrade now.”

10.4 Tier 3 – Race & Performance (Top Tier)
Target clubs: Race-focused programs that run lots of competitions and truly care about race workflows.
Includes everything in Tier 1 & 2, plus:
10.4.1 Race Provider Integrations (Zone4 & others)
Zone4 (and future providers) API integration
Connect club account to provider.
Pull race calendar into Ski Admin.
Race roster building
Filter athletes by program/age/ability.
Assign athletes to race categories.
One-click “mass signup”
Push selected roster to Zone4 via API.
Store RaceEntry records in your DB.
Race entry views
For admins & coaches:
See who’s entered in which race.
Export entry lists.
For parents (later):
View athlete’s upcoming race entries.
10.4.2 Advanced Reports & Analytics
Race-related reports:
Number of race starts per athlete, per program, etc.
Which programs produce the most race participation.
Possibly future performance metrics:
This can be a placeholder now, expand later.
Upsell angle: “You can build rosters and export CSV in Tier 2, but if you want direct Zone4 push + race calendar sync, that’s Tier 3.”

10.5 Implementation Considerations
Feature flags per club:
subscription_tier: :core | :comm | :race
Derived boolean flags: can_bulk_email?, can_sms?, can_race_api?.
UI gating patterns:
Show items in navigation but:
Greyed out with lock icon.
Tooltip: “Available on Communication & Operations plan.”
Migration/upgrade story:
Clubs can upgrade from Tier 1 → 2 → 3 instantly.
Data already in system; upgrade simply unlocks UI + API calls.


