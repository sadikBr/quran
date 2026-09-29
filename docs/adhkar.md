# Adhkar reader and reminders

The public `/azkar` page uses bundled Arabic collections derived from a pinned MIT-licensed Hisn al-Muslim dataset. Morning and evening wording is separated using the source's instructions; compound tasbih entries have separate counters. Text, instructions, original wording, explicit counts, and review flags are stored in `src/features/adhkar/data/collections.json`. There are no runtime API requests or inferred counts. See [content review and provenance](adhkar-content-review.md) for the license, references, changes, and unresolved cases. This is not an independent scholarly authentication of every narration. No audio or translation is bundled. Full offline route support is not included.

## Deployment

1. Run `npm run db:migrate` to add the reminder preferences and delivery ledger.
2. Retain the existing VAPID public/private keys and CRON_SECRET configuration.
3. Configure a trusted scheduler to call `GET /api/cron/adhkar-reminder` every minute with `Authorization: Bearer <CRON_SECRET>`. Never put the secret in the URL or client code.
4. Vercel Pro can run this with `* * * * *` in vercel.json. Hobby does not support minute-level scheduling; use an external scheduler instead. The existing daily schedules have deliberately not been changed to avoid breaking Hobby deployments. See https://vercel.com/docs/cron-jobs/usage-and-pricing.
5. Enable device push notifications in Settings, enable each desired adhkar reminder, select its time and a valid IANA timezone, and save settings. Times are user-selected wall-clock times, not calculated prayer times. Push delivery depends on browser/OS support and connectivity; it is not an exact alarm.

Reminders use a ten-minute catch-up window and a per-device, per-kind, per-local-date unique delivery record. Concurrent invocations claim a five-minute lease. Transient send failures can retry; expired subscriptions are removed. A crash after push delivery but before recording success can redeliver; the stable notification tag replaces the previous notification. DST follows the selected IANA zone; nonexistent spring-forward times shift forward with Luxon. Repeated fall-back times remain limited to one daily delivery record.

Smoke test morning/evening independently, disable either, test two devices, retry the cron, test an invalid cron secret, and verify notification taps open the correct collection. No push notifications are sent by the automated unit tests.
