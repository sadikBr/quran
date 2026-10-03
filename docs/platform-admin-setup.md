# Platform administration — fresh database setup

## Accounts and permissions

- **Admin** is a dedicated platform account. It creates/deletes circles and appoints or replaces supervisors at `/admin`. It does not join circles, receive assignments, host meetings or receive learning reminders.
- **Supervisor** is a circle-specific role, not a global user privilege. Supervisors manage schedules, invitations, members, assignments, reviews and attendance in their own circles. They can participate in assignments themselves.
- **Member** is the default for every public signup. Members join by invitation. Supervising one circle does not grant access to another.
- Circles can be created without a supervisor and edited later. They have at most one supervisor. Meeting schedules are saved but stay inactive until a supervisor is assigned. Replacement keeps the former supervisor as a member, promotes the selected person and changes the meeting host atomically. A live host blocks replacement/deletion. The room identifier changes to prevent previously issued host tokens from granting access to the new room.
- Admin and current supervisors cannot delete their accounts. Replace a supervisor first.

## Start fresh

The checked-in initial migration is for an **empty database**, not the old test schema. No reset or deletion is performed by these scripts.

1. Create a new empty PostgreSQL database and configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` to point to it. Keep the old database until you are happy with the new setup.
2. Configure the existing auth, JaaS and notification variables as usual.
3. Set these **server-only** values in your local `.env.local` or your secure deployment environment:

   ```dotenv
   PLATFORM_ADMIN_EMAIL=your-dedicated-admin-email
   PLATFORM_ADMIN_NAME=Platform administrator
   PLATFORM_ADMIN_PASSWORD=your-unique-strong-password
   ```

   Use a unique password of 16–128 characters. Do not prefix these variables with `NEXT_PUBLIC_`, commit them, or reuse your personal account email.
4. Run `npm run db:setup` (or `bun run db:setup`) against that database. This applies migrations, then creates the admin using Better Auth password hashing. An existing admin is left untouched. An existing ordinary account with the bootstrap email causes setup to fail rather than being silently promoted.
5. Start the app and sign in with the dedicated admin account. It opens `/admin`.
6. Sign up separately with your **personal email** and have other supervisors sign up too. As admin, create a circle, search for the personal account, choose it as supervisor, and set meeting times.
7. Sign out of admin and into your personal account to manage the circle. Share its invitation code with members.

## Vercel deployment

Run `db:setup` as a controlled, one-time release step using the **production database** before serving the new code. Subsequent releases can rerun it safely: an existing admin's password is never overwritten. There is no public setup endpoint and no “first visitor becomes admin” behavior.

Do not attach production database setup to the generic Vercel build command: previews must not change production. The bootstrap refuses Vercel preview/development environments. Run the release step from a trusted local environment or production-only CI job; keep preview databases separate. Normal `npm run build` does not create or alter accounts.

After successful setup, remove `PLATFORM_ADMIN_PASSWORD` from persisted environment files/settings if it is no longer needed. Existing admins are detected before requiring bootstrap credentials. Change the account password through the profile page, not by changing the bootstrap variable.

If you lose admin access, recover it through a deliberate operator procedure; setup will not reset it or create a second admin. The database enforces at most one platform admin and at most one supervisor per circle.

## Verification

For an existing installation, run `bun run db:migrate` before using optional supervisors. This adds nullable meeting hosts without resetting existing circles or accounts. The admin's **Edit circle** action updates the name and description; **Assign supervisor** activates the previously saved schedule.

- `npm run test:admin`: bootstrap safety tests.
- `ADMIN_TEST_DATABASE_URL=postgresql://.../your_role_tests bun run test:admin:integration`: actual authentication and permission checks against a migrated, empty, disposable database. The suite refuses databases whose name does not end in `_role_tests`, refuses nonempty databases, and does not erase data.
- `npx tsc --noEmit`: type checking.
- Test separate sessions for admin, supervisor and member: only admin can create/delete/reassign circles; only the appointed supervisor can manage a circle; a supervisor remains an ordinary member elsewhere.
- Check meeting host transfer, notification recipients, member invitation, and supervisor self-assignment after setup.

## User management

`/admin/users` replaces the retired correction-request entry point. The directory supports name/email search, active/suspended/supervisor filters and pagination. Account pages show join date, memberships, saved-record counts and a paginated administration history. Counts are records, not memorized ayahs.

- **Reset app data** previews the affected categories and requires the account email and a reason. It clears personal memorization/assessments and correction history, all learning plans and sessions, received assignments, reading/wird/khatmah records, bookmarks/collections, attendance and circle membership, onboarding, reminders and login sessions. Account preferences return to defaults. Name, email, password and account identity remain. Assignments/reviews belonging to other learners and the minimal administration log remain.
- Resetting a suspended account does not reactivate it. Supervisors must hand over their circles before reset or suspension. Platform admins cannot be targeted. Reset and audit writes are atomic; stale or repeated submissions fail without clearing data again.
- **Suspend access** preserves learning data, revokes sessions and notification subscriptions, and blocks sign-in. **Reactivate access** allows a new sign-in. Suspended users cannot be appointed as supervisors.
- **Sign out all devices** revokes existing sessions and notification subscriptions. It is blocked while the user hosts a live meeting. Session-creation hooks also reject sessions that race with a reset, suspension or sign-out. Cookie session caching is disabled.
- Account-scoped recall-test settings and wird drafts are invalidated by a reset and removed from browser storage when the user returns. Shared offline Quran downloads and device-only counters remain on the device.
- Every action requires a short reason, recorded with the administrator, target and timestamp. The log does not retain erased learning content. Permanent account deletion and selective resets are not part of these support controls.

Apply additive migrations `0034_user_management` and `0035_user_data_reset` with `bun run db:migrate` before serving this version. Test with `USER_MANAGEMENT_TEST_DATABASE_URL=postgresql://.../empty_user_management_tests bun test scripts/user-management.integration.test.mjs`. This opt-in suite migrates its own empty disposable database, refuses nonempty databases, and exercises real authentication, data isolation, transaction rollback, suspension, revocation and the audit log. Browser-storage reset coverage is in `scripts/reset-local-data.test.mjs`.

Nothing in this implementation deletes the old test database or deploys to Vercel automatically.

The `data_reset_at` field is introduced by migration `0035_user_data_reset`, separately from `0034_user_management`, so databases that already applied the original user-management migration upgrade correctly. The new migration also accepts an already-present field without losing reset dates. Upgrade regression: `USER_MIGRATION_TEST_DATABASE_URL=postgresql://.../empty_migration_tests bun test scripts/user-management-migration.integration.test.mjs`. Never add a new schema change to an already-applied migration; add a subsequent migration.
