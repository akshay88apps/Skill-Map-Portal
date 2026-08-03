# Tech Leaders Skill Portal — Autonomous Build Playbook
### For execution in VS Code + Codex

---

## 0. What this document is

A sprint-by-sprint prompt set you can paste directly into Codex (in VS Code) to build the portal end-to-end with minimal human intervention. Every sprint has:
- a **Goal**
- a **Codex prompt** (copy-paste ready)
- a **Definition of Done**
- a **Human checkpoint** flag — most sprints have none; the agent is expected to make the call itself and log it

This is built directly against `Tech_Leaders_Skill_Gathering.xlsx` (7 real responses inspected) — the schema, data-quality issues, and normalization rules below are drawn from that actual data, not assumptions.

---

## 1. What the source data actually looks like

Your current intake (a Microsoft Forms export) has 16 columns, mostly free text. Key observations that shape the design:

| Column | Issue observed | Design implication |
|---|---|---|
| `Your total relevant experience is?` | Mixed formats: `"7"`, `"10+"`, `"7+"` | Needs a numeric-experience normalizer, not a plain int field |
| `Years of Experience in Technology Leadership` | Bucketed strings: `"6-10 years"`, `"3-5 years"`, `"Less than 3 years"` | Store both the bucket (as submitted) and a derived numeric midpoint for sorting/filtering |
| `Past Projects, duration & your role in project` | Long unstructured free text, wildly inconsistent formatting across responders (bullet lists, paragraphs, inline "Role - X, Duration - Y") | Cannot be queried or matched as-is. Needs an AI extraction step into structured `Project` records (see Sprint 3) |
| `Primary Skill` / `Secondary Skill` / `Which technical skills are you most proficient in?` | Overlapping, near-duplicate content per responder (e.g. one person lists "MS Dynamics" in one field and "MS Dynamics CRM" in another) | Needs a skill taxonomy + fuzzy-matching/canonicalization layer, not literal string storage |
| `Tools you know` | Comma-separated free text of wildly varying length (2 tools to 40+ tools) | Store as many-to-many `Tool` records, not a text blob |
| `Any Certification` | Mix of real certs (`PL-400, PL-600`, `DP-600, DP-700`) and `"N/A"` / `"yes"` | Needs validation against a certification reference list; junk values discarded, not stored |
| `Email` | Inconsistent domains (`@moreyeahs.in` vs `@moreyeahs.com`) | Don't assume a single corporate domain in auth/validation logic |
| `Full Name` vs `Name` | Sometimes identical, sometimes `Name` is a shortened version | Keep both; `Full Name` is canonical, `Name` is `preferred_name` |

This confirms the portal's hardest problem isn't the UI — it's turning **inconsistent free text into a structured, queryable skills graph**. Sprint 3 (AI Ingestion Engine) is the sprint that actually earns its place in this build; treat it as the centerpiece, not a nice-to-have.

---

## 2. Design references worth borrowing (and why)

| Portal | What to borrow | Why it fits here |
|---|---|---|
| **Workday** | Structured profile pages with tabbed sections (Experience / Skills / Certifications / Career Journey), org-chart-aware navigation | Your data already has these natural sections |
| **LinkedIn Skills / Talent Insights** | Endorsement-free skill tagging with a canonical taxonomy (skills map to a controlled vocabulary, not free text) | Directly solves the "MS Dynamics" vs "MS Dynamics CRM" vs "MS CRM" problem visible in your data |
| **Confluence** | Every leader gets a browsable "profile page," version history on edits, comment/mention capability for peer review of a colleague's listed expertise | Matches your "capture details of leaders" framing better than a rigid HR form |
| **Gusto / BambooHR skill matrices** | Heatmap view: rows = leaders, columns = skills, cell = proficiency — used for staffing and gap analysis | Directly reusable for your KPI/L&D integration use case |
| **GitHub's contribution graph pattern** | Quarterly activity trend per leader (skill growth over time) | Good visual model for the KPI portal's quarterly cadence |

---

## 3. Target architecture

Recommended stack (chosen for strong Codex code-generation reliability, not novelty):

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API routes (or a separate Node/Express service if you prefer service isolation) + Prisma ORM
- **Database:** PostgreSQL
- **Auth:** Azure AD / Entra ID SSO — your own leaders' data already references Entra ID/Microsoft 365 as the org's identity layer, so this avoids introducing a second identity system
- **AI extraction layer:** Anthropic (Claude) API for parsing free-text project/skill entries into structured records — fits naturally since MoreYeahs already positions itself as AI-first
- **Integrations:** Adapter pattern — a thin, swappable connector module per external portal (L&D, KPI), so the exact API shape of those systems can be plugged in later without touching core domain logic
- **Deployment:** Containerized (Docker) so the hosting decision (Azure vs on-prem vs other) can be made independently of the build

---

## 4. Standing Agent Instructions (paste this once, before Sprint 0)

This is the single most important prompt in this playbook — it's what makes everything downstream autonomous instead of a back-and-forth.

```
You are the lead engineer for the "Tech Leaders Skill Portal" project. You will
receive a series of sprint prompts. For each one:

1. Work fully autonomously. Make reasonable technical decisions yourself
   (library choices, folder structure, naming, error handling, edge cases)
   without asking for confirmation.
2. Every decision you make that a human might want visibility into — but that
   does NOT require their approval to proceed — gets logged as a dated entry
   in /docs/DECISIONS.md with a one-line rationale. Keep working; don't wait
   for a response.
3. Only STOP and explicitly flag the human if the task requires one of these
   (write the flag as a clearly marked "## HUMAN INPUT NEEDED" section at the
   top of your response, then continue with everything else you CAN do):
   - Credentials, API keys, or endpoint URLs for external systems (the L&D
     portal, the KPI portal, SSO tenant details)
   - A choice with real budget impact (cloud provider, paid third-party
     service, licensing)
   - Anything that would delete or overwrite production data
   - A genuine legal/compliance question (data residency, retention policy
     for employee PII) that isn't answerable from the codebase or this brief
   - Confirmation to actually deploy to production / go live
4. Write tests for every feature you build (unit tests minimum; integration
   tests for API routes). A sprint is not done until its tests pass.
5. Commit with descriptive messages after each logical unit of work — don't
   batch unrelated changes into one commit.
6. Update /docs/ARCHITECTURE.md whenever you introduce a new module,
   dependency, or integration pattern, so the docs never drift from the code.
7. If a sprint prompt is ambiguous, resolve the ambiguity yourself using the
   patterns established in earlier sprints, log the interpretation in
   DECISIONS.md, and proceed. Do not ask clarifying questions unless the
   ambiguity falls into the STOP list above.

Confirm you've understood this operating mode, then wait for Sprint 0.
```

---

## 5. Human checkpoints across the whole project

Everything else is autonomous. These are the only points where a strategic decision is genuinely needed from you:

1. **Sprint 0** — confirm cloud/hosting target and budget ceiling for the Claude API usage in Sprint 3
2. **Sprint 0** — confirm Azure AD/Entra ID is the correct SSO source of truth (or name the real one)
3. **Sprint 3** — spot-review a sample of AI-extracted project/skill records for accuracy before they're trusted at scale
4. **Sprint 7 / 8** — supply actual API docs or endpoints for the existing L&D and KPI portals (the adapter pattern means the agent can build against a mock contract until these arrive)
5. **Sprint 10** — approve production go-live and data-retention policy for leaders' PII before real employee data is loaded

---

## 6. Sprint plan

### Sprint 0 — Discovery, Environment & Scaffolding
**Goal:** Repo, tooling, and environment ready; core architectural decisions locked.

```
Set up a new Next.js 14 (App Router, TypeScript) project called
"tech-leaders-portal". Configure: Tailwind, shadcn/ui, ESLint, Prettier,
Prisma with a PostgreSQL datasource, and a Docker Compose file for local dev
(app + Postgres). Set up Vitest for unit tests and Playwright for E2E.
Create /docs/ARCHITECTURE.md and /docs/DECISIONS.md and seed them with the
stack choices from this brief. Create a GitHub Actions workflow that runs
lint + unit tests on every push. Flag under HUMAN INPUT NEEDED: hosting
target/budget ceiling, and confirmation that Azure AD/Entra ID is the correct
SSO provider.
```
**Definition of Done:** repo builds, CI green, docs exist, human-input flags raised.
**Human checkpoint:** Yes — see §5.

---

### Sprint 1 — Data Model, Schema & Legacy Import
**Goal:** A normalized schema that fixes the data-quality issues in §1, plus a working import of the existing Excel responses.

```
Design a Prisma schema for: Leader, Skill (canonical taxonomy table, with a
SkillAlias table for raw-text variants that map to it), LeaderSkill (join
table with proficiency + source: primary/secondary/proficient), Project
(name, client, role, duration_text, duration_months_estimate, status,
leader_id), Certification, Tool, LeaderTool. Store both raw submitted text
and normalized fields wherever normalization is lossy (e.g. keep
experience_bracket_raw AND experience_years_estimate). Write a migration
script that imports Tech_Leaders_Skill_Gathering.xlsx into this schema,
handling: mixed experience formats ("7" vs "10+"), Name vs Full Name,
inconsistent email domains, and "N/A"/"yes" junk values in Certification
(discard, don't store as a fake cert). Write unit tests against the 7 real
rows to confirm the import produces sane output.
```
**Definition of Done:** schema migrated, import script runs clean against the sample file, tests pass.
**Human checkpoint:** None.

---

### Sprint 2 — Core Backend Services
**Goal:** CRUD APIs for the full domain model, with validation.

```
Build REST API routes (or tRPC, your call) for full CRUD on Leader, Project,
Certification, Tool, and LeaderSkill, with Zod validation on all inputs.
Add pagination, filtering (by department, skill, experience bracket), and
sorting to the Leader list endpoint. Add optimistic concurrency (updatedAt
check) to prevent silent overwrites when two people edit a profile at once.
Write integration tests covering validation failures and the filtering
logic.
```
**Definition of Done:** all endpoints tested, OpenAPI/schema doc generated.
**Human checkpoint:** None.

---

### Sprint 3 — AI Ingestion & Normalization Engine (centerpiece sprint)
**Goal:** Turn the free-text project/skill fields into trustworthy structured data.

```
Build an ingestion service that calls the Claude API to: (1) parse the
free-text "Past Projects" field into discrete Project records (name, client,
role, duration, status — closed/active), (2) take Primary/Secondary/
"most proficient" skill fields plus Tools, dedupe overlapping entries, and
map each raw string to a canonical Skill via the SkillAlias table, creating
a new canonical Skill + flagging it for review if no confident match exists.
Attach a confidence score to every AI-extracted record. Anything below 0.7
confidence goes into a "needs_review" queue rather than being auto-committed.
Build a small internal review UI (table with approve/edit/reject actions)
for that queue. Write tests using the 7 real responses as fixtures, checking
that known-messy rows (e.g. Roopesh Mandloi's project list) produce sane
structured output.
```
**Definition of Done:** ingestion pipeline runs on all 7 sample rows, review queue UI works, confidence thresholding tested.
**Human checkpoint:** Yes — review a sample of extracted records for accuracy (§5, item 3) before trusting the pipeline at scale.

---

### Sprint 4 — Self-Service Profile Portal (leader-facing)
**Goal:** Replace the Microsoft Forms intake with a proper in-app experience.

```
Build a multi-step profile wizard (Workday-style: Basic Info → Experience →
Projects → Skills/Tools → Certifications → Career Journey) that leaders fill
in themselves, authenticated via Azure AD SSO. Pre-fill from any existing
imported data. Autosave drafts. On submit, run entries through the Sprint 3
ingestion service. Add a "my profile" view where a leader sees their own
structured profile and can request edits (edits above a certain size go to
the review queue, not straight to live). Write E2E tests for the full wizard
flow with Playwright.
```
**Definition of Done:** a leader can log in, complete, and see their own live profile; E2E suite passes.
**Human checkpoint:** None (Azure AD tenant config from Sprint 0 already unblocks this).

---

### Sprint 5 — Leader Directory & Skill Matrix Explorer
**Goal:** The main discovery surface — Confluence-style browsing plus a Workday/BambooHR-style skill matrix.

```
Build: (1) a searchable/filterable Leader Directory with card and full-page
profile views (Confluence-style: tabs for Experience/Skills/Projects/Career
Journey, with an edit-history panel), (2) a Skill Matrix view — leaders as
rows, canonical skills as columns, proficiency as a heatmap cell — filterable
by department, with CSV export, (3) a "find leaders by skill" search that
also surfaces adjacent/related skills from the taxonomy. Add loading states
and empty states throughout. Write component tests for the matrix rendering
logic and search relevance ordering.
```
**Definition of Done:** directory and matrix fully navigable, CSV export works, tests pass.
**Human checkpoint:** None.

---

### Sprint 6 — Admin Console & Governance
**Goal:** Give someone (HR/leadership ops) control without needing engineering help.

```
Build an admin console (RBAC-gated: admin role only) with: bulk import/export
(CSV/XLSX), the AI-ingestion review queue from Sprint 3, an audit log of all
profile changes (who/when/what/before-after diff), a data-quality dashboard
(profiles missing key fields, unresolved skill aliases, stale profiles not
updated in 2+ quarters), and role management (assign admin/leader/viewer
roles). Write tests for RBAC enforcement — confirm non-admins are blocked
from every admin route at the API layer, not just hidden in the UI.
```
**Definition of Done:** RBAC enforced server-side and tested, audit log captures real diffs, data-quality dashboard reflects live data.
**Human checkpoint:** None.

---

### Sprint 7 — L&D Portal Integration
**Goal:** Skill gaps identified here should drive learning recommendations there.

```
Build an adapter module (interface-first: define the contract this system
needs regardless of the real L&D API) that: (1) exposes each leader's skill
gaps (skills below a target proficiency, or missing entirely for their
role/department) as a structured payload, (2) pushes/pulls that payload to
the L&D portal via a swappable connector class, (3) receives course-
completion webhooks back and updates the leader's skill proficiency with a
"source: L&D completion" tag distinct from self-reported or AI-extracted
data. Build the connector against a mock server first so the whole flow is
testable end-to-end without the real L&D API. Write integration tests
against the mock.
```
**Definition of Done:** full gap→push→completion-webhook flow works against the mock; connector is a single swappable class.
**Human checkpoint:** Yes — real L&D portal API docs/credentials needed to swap the mock for production (§5, item 4). Build proceeds fully on the mock until then.

---

### Sprint 8 — KPI Portal Integration (quarterly)
**Goal:** Tie skill development to the quarterly KPI measurement cycle.

```
Build a second adapter (same pattern as Sprint 7) that: (1) on a quarterly
schedule, packages each leader's skill/certification deltas since last
quarter into a KPI-portal-compatible payload, (2) supports a manual
"generate this quarter's snapshot now" trigger for the admin console,
(3) stores a historical snapshot locally (don't rely solely on the external
portal for history — you want your own trend charts). Add a "skill growth
trend" chart per leader (quarter over quarter) reusing the local snapshots.
Build and test against a mock KPI endpoint first, same as Sprint 7.
```
**Definition of Done:** quarterly snapshot generation works on schedule and on-demand, trend chart renders from local history, tested against the mock.
**Human checkpoint:** Yes — real KPI portal API docs/credentials needed for production swap (§5, item 4).

---

### Sprint 9 — Analytics, Notifications & Reporting
**Goal:** Make the data actionable for leadership, not just browsable.

```
Build: (1) an executive dashboard (org-wide skill coverage, top skill gaps
by department, certification expiry alerts, leadership-experience
distribution), (2) scheduled digest notifications (email + Teams webhook)
for: profiles not updated in 2 quarters, new skill-review-queue items
pending, quarterly KPI snapshot ready, (3) a quarterly PDF/report export for
leadership review. Write tests for the notification scheduling logic and
snapshot report generation.
```
**Definition of Done:** dashboard reflects live data, notifications fire on schedule in a staging test, report export is correct.
**Human checkpoint:** None.

---

### Sprint 10 — Hardening, Testing & Launch
**Goal:** Production-ready.

```
Run a full security pass: dependency audit, RBAC re-verification across
every route, rate limiting on public-facing endpoints, PII field-level
access logging. Write a load test for the Leader Directory and Skill Matrix
under concurrent access. Fill any test-coverage gaps flagged by the CI
coverage report. Write a runbook (/docs/RUNBOOK.md) for deployment,
rollback, and incident response. Prepare (but do not execute) the production
data-migration plan for loading real employee data. Flag under HUMAN INPUT
NEEDED: approval to go live, and confirmation of the PII retention policy
before real leader data is loaded.
```
**Definition of Done:** security pass complete, load test results documented, runbook exists, migration plan ready for approval.
**Human checkpoint:** Yes — go-live approval and PII retention policy (§5, item 5).

---

## 7. How to actually run this

1. Paste §4 (Standing Agent Instructions) into Codex once, at the start of the session.
2. Paste each sprint prompt in order. Let the agent run fully before moving to the next — don't parallelize sprints early on, since later sprints depend on schema/taxonomy decisions made in Sprints 1–3.
3. Check `/docs/DECISIONS.md` periodically rather than every session — it's the log of everything the agent decided without needing you, and it's your fastest way to audit the build without reading every diff.
4. Only step in when a "## HUMAN INPUT NEEDED" section appears.
