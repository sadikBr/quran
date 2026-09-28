# Quran

A Quran reading and memorization application built with Next.js. The current application supports account authentication, browsing the surah index, reading individual surahs, navigating the standard 604-page Quran layout, and saving private bookmarks and reflections.

## Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS 4 with shadcn/ui-style components
- Better Auth with email and password authentication
- PostgreSQL and Drizzle ORM
- Al Quran Cloud for Quran text and metadata
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
      server/              # Server-only Quran Cloud data access
      types.ts             # Quran Cloud response types
  drizzle/                 # Database client and schema
  data/env/                # Server environment validation
  lib/                     # Cross-feature utilities
```

The Quran reader calls server-only functions directly; it does not make HTTP requests back to its own application. The only API route is the Better Auth handler required by the authentication library.

## Quran data

Quran data is retrieved from [Al Quran Cloud](https://alquran.cloud/api). The server utilities validate upstream HTTP responses and JSON before returning data to pages. Failures are logged on the server and return a safe, generic error to the application.

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

## Planned work

- Memorization progress and review scheduling
- Goals and reading history
- Translation and audio selection
- User dashboard and progress summaries
- Admin task assignment and points
- Automated tests and production monitoring
