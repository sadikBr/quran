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
