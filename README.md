# Quran

A Quran reading and memorization application built with Next.js. The current application supports account authentication, browsing the surah index, reading individual surahs, navigating the standard 604-page Quran layout, and saving private bookmarks and reflections.

## Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4 with shadcn/ui-style components
- Better Auth with email and password authentication
- PostgreSQL and Drizzle ORM
- Quranpedia for Hafs and Warsh text, translations, tafsir, and reciters
- Biome for formatting and static analysis

## Project structure

```text
src/
  app/                    # Next.js routes and page composition
    api/auth/              # Better Auth handler
    quran/                 # Quran reader routes
  components/ui/           # Generic reusable UI primitives
  features/
    auth/                  # Better Auth client and server configuration
    quran/
      components/          # Quran-specific presentation components
      server/              # Server-only Quranpedia data access
      types.ts             # Shared reader data types
  drizzle/                 # Database client and schema
  data/env/                # Server environment validation
  lib/                     # Cross-feature utilities
```

The Quran reader calls server-only functions directly; it does not make HTTP requests back to its own application. API routes also serve search and versioned offline Quran datasets.

## Quran data

Quran content is retrieved exclusively from [Quranpedia](https://api.quranpedia.net/). Hafs and Warsh use its official compressed mushaf downloads; translations use its complete book downloads, and tafsir uses its per-ayah API. All reader, search, practice, memorization, and offline flows share the same normalized data.

Quranpedia supplies the Arabic surah metadata, page and division assignments, and sajda markers. Editions use Quranpedia resource IDs throughout settings, reading, search and offline downloads. The app maintains its own English interface labels. See [the data-layer notes](src/features/quran/server/README.md) for the catalogue, validation and database setup.

Run `bun test scripts/quranpedia-data.test.mjs scripts/quranpedia-reader.test.mjs` for provider and reader regression checks. `bun scripts/verify-quranpedia.mjs` additionally validates the current public upstream datasets (requires network access).

## Midnight Bloom theme

Choose **Midnight Bloom** (أزهار منتصف الليل) in Settings → Appearance. The theme uses the same navy, soft blue, lavender, and teal palette as the companion terminal and editor themes, with brighter tajweed colors for reading on a dark background.

Run `bun run db:migrate` before deploying to an existing database. Migration `0029_midnight_bloom_theme` adds the theme to the saved-preference enum.

Three more themes are available in the same picker: **Glacier** (الجليد الأزرق)
uses white surfaces and cobalt accents; **Saffron** (الزعفران) pairs golden paper
with dark ink; **Citron** (الأترج) uses olive-black surfaces, lime controls and fig
accents. Each includes coordinated reader, chart, navigation and browser colors.
Theme thumbnails use the actual palette tokens. Migration
`0032_glacier_saffron_citron_themes` enables saving these choices; apply it with
`bun run db:migrate` when deploying to an existing database.

## Automatic memorization tracking

Learners review and lock their starting hizbs at `/memorization`. Existing manual selections are prefilled; an empty starting record is valid. One changed correction is allowed immediately after setup, until three hours have elapsed. Cancelling, saving an unchanged selection, and failed saves do not consume it. Later requests appear in the administrator’s `/admin/memorization` inbox. Approval grants one saved correction, available until used.

Progress combines the starting record with confirmed personal practice and successful circle reviews. Reaching a reading position or playing audio alone does not add memorization. Personal practice requires an explicit confirmation after reaching the range’s end and works without circle membership. Coverage accumulates by ayah without counting overlaps twice; a hizb is complete only when its entire range is covered. Hafs and Warsh share Quranpedia’s verse correspondence, including split verses. Revision feedback flags a range without deleting earned progress.

Run `bun run db:migrate` before deploying this feature. Migration `0027_automatic_memorization` preserves existing selections and backfills previously reviewed completed assignments. Starting-record changes, requests, and assessments are stored separately, so later corrections or assignment deletion do not erase earned progress.

Validation:

- `bun test scripts/memorization-progress.test.mjs scripts/meeting-only-review.test.mjs`
- `MEMORIZATION_TEST_DATABASE_URL=… bun test scripts/memorization-record.integration.test.mjs` requires an **empty disposable** PostgreSQL database ending in `_memorization_tests`; it never loads the app’s database environment.
- `REVIEWER_TEST_DATABASE_URL=… bun test scripts/halqa-reviewers.integration.test.mjs` checks group permissions and assessment snapshots in an empty disposable database ending in `_reviewer_tests`.

## Getting started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure database environment variables:

   ```text
   DB_NAME=
   DB_HOST=
   DB_USER=
   DB_PASSWORD=
   DB_PORT=
   ```

   To enable daily Wird push reminders, generate a VAPID key pair:

   ```bash
   bun run push:keys
   ```

   Add the generated keys and a private cron secret to both your local
   environment and the Vercel project:

   ```text
   VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   CRON_SECRET=
   ```

   To enable private group video meetings, create a Jitsi as a Service (JaaS)
   application and API key, then add the following values locally and in
   Vercel:

   ```text
   JAAS_APP_ID=vpaas-magic-cookie-...
   JAAS_API_KEY_ID=vpaas-magic-cookie-.../key-id
   JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

   `JAAS_API_KEY_ID` is the complete `kid` shown by the JaaS console. The
   private key may contain real line breaks or escaped `\n` line breaks. Never
   expose it through a `NEXT_PUBLIC_` variable.

3. Push the current Drizzle schema to the database:

   ```bash
   bun run db:push
   ```

4. Start the development server:

   ```bash
   bun run dev
   ```

## Commands

```bash
bun run dev       # Start the development server
bun run build     # Create a production build
bun run start     # Run the production server
bun run lint      # Run Biome checks
bun run format    # Format files with Biome
bun run db:push   # Push the Drizzle schema to PostgreSQL
bun run push:keys # Generate the Web Push VAPID key pair
```

## Daily Wird reminders

Users can enable the reminder per device from Settings. At approximately 11 PM
in `Africa/Casablanca`, the scheduled function checks for an incomplete daily
Wird and sends a notification that opens `/wird/read`. Two once-daily UTC cron
entries cover Morocco's seasonal UTC offset; the endpoint sends only during the
local 11 PM hour and records each delivery to prevent duplicates.

## Study days and weekly memorization

Members save revision and memorization weekdays in Settings or either weekly plan.
The same day can serve both activities. Existing revision weekdays migrate into this
shared schedule; memorization days remain unset until the member chooses them.
Saving weekdays immediately reschedules unfinished daily portions using the latest
days for each activity. Session IDs, passages, reading positions, completed work and
circle credit are kept. Clearing an activity's days leaves its pending portions
undated until days are selected again; reminders follow the recalculated dates.

At `/memorization/plan`, members preview and enable a weekly target of 1–28 quarter
hizbs (1 = quarter hizb, 2 = half, 4 = one hizb), choose a starting passage, and
memorize forward or backward through quarters. Unmemorized ayahs in the selected
quarters are split as evenly as possible across the remaining saved memorization
days, without splitting ayahs or spanning already-memorized gaps. A partially
memorized quarter schedules its remaining ayahs. Unfinished daily portions carry
forward on the saved study days, including across weeks, before a new batch is
generated. Daily portions are not combined to catch up. Carried-over and new
memorization share a calendar-week limit in the plan's time zone. Each native
quarter with newly confirmed memorization uses one slot that week, including a
partially completed quarter and new circle-confirmed coverage. Further portions
of that same quarter share its slot; baseline coverage and repeated revision do
not use slots. Once the allowance is full, new quarters wait until the next week.
Missed weekly targets do not accumulate. Previews, regeneration, automatic
scheduling and reader writes enforce the same allowance; deleting or rebuilding a
plan does not reset confirmed work. Target and reading changes apply to the next
batch; completed passages are skipped.

Both weekly plans share the same settings, preview, progress and session layout.
Cancel restores the saved settings; pause keeps results, and resume requires a
preview. These pages manage plans and display their schedules. Today’s active
cards open the Practice reader directly; future, completed and paused cards are
informational. `/practice` also shows each enabled plan’s unfinished portions for today
in that plan’s time zone, including missed portions carried to today. Only these
portions can open at `/practice/memorization/[sessionId]/read` or
`/practice/revision/[sessionId]/read`; reader access and progress/completion writes
enforce the same current-day rule. Reader routes, layouts and ayah interception
live under Practice.
Completed, future, paused and unscheduled sessions cannot be opened.
Both readers return to Practice, persist the last reached ayah and skip coverage already credited elsewhere.
They share an intercepted ayah-actions overlay, loading state and audio provider;
closing or going back returns to the same reader, and direct ayah links remain
standalone pages.

Both plans offer **Regenerate plan** with a preview and explicit **Replace
schedule** action. It rebuilds sessions from the saved weekdays and chosen amount,
starting on the next available study day and using the remaining days in that
week. If no selected days remain this week, it starts next week. The preview shows
the actual session and study-day counts; available passages may limit capacity.
Replacing a schedule resets unfinished reading positions; confirmed memorization
and review assessments remain, and paused plans stay paused. A changed reading
position, completion, plan setting or study schedule invalidates an old preview.

**Delete plan** requires confirmation and removes only that activity's plan,
schedule snapshots and sessions. Recorded memorization, review assessments, shared
study weekdays and the other plan remain. Deleted plans do not restart on refresh,
and old session links cannot update them. Confirmation tokens are tied to the saved
plan state so an older dialog cannot delete a newly created replacement.

The memorization grid shows upcoming ayahs separately from actual progress.
Open passage uses the existing memorization reader, bounded to the session’s
remaining ayahs and saved riwayah. Scheduling or reading a passage does not grant credit. Explicit completion and
confirmed circle reviews share the existing memorization assessment history;
overlapping coverage is counted once. Pausing retains existing results.

Apply migrations `0030_learning_plans` and `0031_memorization_reading_progress`
with `bun run db:migrate` before running the
updated app. Run `bun test scripts/weekly-memorization.test.mjs scripts/weekly-memorization-reader.test.mjs scripts/weekly-reader-routes.test.mjs scripts/learning-refresh.test.mjs`. Database tests use
`LEARNING_TEST_DATABASE_URL` pointing to an empty disposable PostgreSQL database
whose name ends in `_learning_tests`; run
`bun test scripts/weekly-memorization.integration.test.mjs`. These tests also verify
migration of existing revision days, stable snapshots, ownership, concurrency,
and planned versus completed grid coverage.

## Weekly memorization revision

After locking their starting memorization record, members can opt in at
`/memorization/revision`, use their saved study days and choose a daily amount (a quarter,
half, or full hizb), and preview the ranges before enabling the plan. Only fully
memorized hizbs are eligible. The schedule uses native Hafs/Warsh quarter boundaries,
rotates through older passages, and reserves part of new schedules for difficult
passages. Each quarter appears at most once in a saved schedule; small memorization
records leave extra days free.

Saved daily portions form a queue. Missed portions move to the next selected study
day, shifting later portions without increasing the daily workload. The original
date is shown on moved cards. The latest unfinished schedule continues across week
boundaries with the same session IDs, reading positions and circle credit. No new
schedule replaces it until its eligible portions are finished; superseded historical
snapshots do not create a backlog. Amount and reading changes apply to the next
generated schedule. Saved study days immediately reflow the pending dates, and
reminder changes take effect immediately. Pausing retains all results.
Confirmed circle reviews since the saved schedule began count toward matching ayahs, and
personal review results are stored in the existing memorization history. Difficult
reviews flag passages for more practice without removing memorization.

Apply migration `0028_weekly_revision` with `bun run db:migrate`. Optional reminders
also require device notifications, VAPID configuration, and `CRON_SECRET`. The
`/api/cron/revision-reminder` endpoint accepts authenticated GET requests using
`Authorization: Bearer <CRON_SECRET>`. `vercel.json` schedules it every five minutes;
the hosting plan must support that frequency (or use an external scheduler). Each
device receives at most one reminder per local day, only for outstanding sessions
within 30 minutes of its chosen time. Reminder changes apply immediately using the
current schedule's timezone. Reminders are disabled by default.

Run scheduler tests with `bun test scripts/weekly-revision.test.mjs scripts/learning-carry-forward.test.mjs`. Database tests
use `REVISION_TEST_DATABASE_URL` pointing to an empty disposable PostgreSQL database
whose name ends in `_revision_tests`; they migrate and populate that database only.

## Offline Quran

The installed app automatically downloads a compact, versioned copy of the
complete Quran for Hafs and Warsh, together with the Saheeh International
English translation. The service worker also stores the offline reader and its
essential fonts and assets. Chrome is asked to make the storage persistent, and
the download state can be checked or refreshed from Settings.

Quran text remains available without a connection at `/offline`. Audio, tafsir,
account updates, bookmarks, and progress syncing still require the network.

Offline readiness includes the reader's scripts, styles and fonts. A failed
download keeps the previous cached reader available and does not report the new
version as ready.

## Push subscription security

Apply migration `0025_push_session_ownership` with `bun run db:migrate` before
deploying this version. It adds a nullable session reference to device push
subscriptions; deleting or revoking the session removes its subscriptions.
Existing subscriptions have no verified session and must be enabled again from
Settings after the upgrade. Signing out also clears local subscriptions and
displayed notifications. Queued notifications are displayed only after checking
that their original session is still signed in on the device.

Push destinations are restricted to supported Google, Mozilla, Apple and Windows
browser push services, and all sends use a ten-second socket timeout. New push
providers must be explicitly added to the allowlist.

Run `bun test scripts` for regression checks. To test migration, concurrent Wird
rollover and push revocation against PostgreSQL, set `SAFETY_TEST_DATABASE_URL`
to an **empty disposable database whose name ends in `_safety_tests`**, then run
`bun test scripts/safety-fixes.integration.test.mjs`. This test refuses a
nonempty database and never uses the application's database environment variables.

## Circle activation

Apply migration `0026_circle_activation` with `bun run db:migrate` before running
the updated app. Existing circles remain active; new circles start inactive and
in preparation. In **Platform administration**, the app admin can activate or
deactivate each circle. A supervisor and meeting schedule are required to activate.

Invites, membership/reviewer setup, and schedule editing remain available during
preparation. Meetings, assignments, reminders, and attendance tracking pause until
activation. Activation starts with the next scheduled meeting and moves unfinished
work with elapsed deadlines forward while preserving progress and history. End a
live meeting before deactivating its circle.

To test this lifecycle against PostgreSQL, set `ACTIVATION_TEST_DATABASE_URL` to an
**empty disposable database whose name ends in `_activation_tests`**, then run
`bun test scripts/circle-activation.integration.test.mjs`. The test checks migration
compatibility, admin permissions, preparation, pause/resume, and workflow guards.

## Group video meetings

Group creators choose one or more weekday/time combinations and a timezone.
The application keeps those recurring schedules in local time so daylight
saving changes do not move the meeting. Each occurrence opens for three hours.
The group meeting host receives moderator permissions and other active group
members receive participant permissions through short-lived, server-signed
JaaS tokens. No external Jitsi account is required for family members.

## Planned work

- Memorization progress and review scheduling
- Goals and reading history
- Translation and audio selection
- User dashboard and progress summaries
- Admin task assignment and points
- Automated tests and production monitoring

## Halqa participation and reviewers

Every halqa member, including its supervisor, can receive assignments. **Nobody can review their own assignment.** The supervisor chooses each member’s review role from **Group → Members → member actions → Review role**:

- **No review role:** participates and receives feedback.
- **Supervisor reviewer:** reviews only the current supervisor’s assignments.
- **Reviewer:** reviews any other member’s assignments, including the supervisor’s.

The supervisor reviews other members, and appoints another member to review their own work. Review roles never grant scheduling, hosting, membership management, or absence-decision permissions. Reviews still require live attendance, and access is checked again when saving. Downgrading or removing access takes effect on the server even for an already-open review. Supervisor-only access follows the current supervisor after a handover.

New reviews record the reviewer’s identity. Existing historical attribution is preserved; self-review is no longer available.

Apply migrations with `bun run db:migrate` before running the updated app. Migration `0021_supervisor_reviewer_scope` preserves existing reviewers as general reviewers. Run the regression suite with `bun test scripts`. For the database integration test, set `REVIEWER_TEST_DATABASE_URL` to an **empty disposable PostgreSQL database whose name ends in `_reviewer_tests`**, then run `bun test scripts/halqa-reviewers.integration.test.mjs`. The test applies migrations and writes fixtures only to that database; it refuses nonempty databases.
