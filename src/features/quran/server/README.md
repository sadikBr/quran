# Quranpedia data layer

Quranpedia is the application's only Quran content provider. All content requests use `fetch-quranpedia.ts`.

## Data and identity

- `get-quranpedia-mushaf.ts` retrieves official compressed datasets for mushafs 1 (Hafs), 2 (Uthmani Hafs), and 4 (Warsh).
- `get-quranpedia-surahs.ts` reads the surah index from `/v1/surahs`. Quranpedia supplies Arabic names, counts, revelation types and starting pages. The application's English UI labels are maintained in `../data/surah-labels.en.json`.
- Page assignments come directly from each mushaf's `page_number`; juz and hizb-quarter boundaries come from its division fields; sajda highlighting comes from its printed sajda marker. No separate page-boundary or sajda dataset is used.
- Shared Hafs references follow Quranpedia's base mushaf 1 (1–6,236). Other Hafs scripts map their surah/verse positions to this base. Warsh keeps Quranpedia's own verse IDs and `number_in_hafs` correspondence for translation, practice, progress and audio alignment.
- `get-quran-corpus.ts` supplies page/surah reading, search, guided practice, daily Wird, memorization and offline downloads. Translations join onto the base Hafs corpus by surah/verse reference.
- `get-ayah.ts` retrieves commentary from `/v1/ayah/{surah}/{ayah}/book/{id}`. Missing commentary has an explicit empty state.
- `get-reader-tafsir.ts` resolves the displayed riwayah/surah/verse for both initial commentary and book changes. Warsh loads every mapped reference in order and removes identical repeated passages. Al-Fatiha verse 1 uses reference 2, excluding the unnumbered basmala; its split final verses each retain the shared reference's full commentary.
- Warsh retains its printed division-marker normalization. Its verse boundaries must not be replaced with Hafs boundaries.

## Catalogue

Identifiers use Quranpedia resource types and IDs: `quranpedia.mushaf.1`, `quranpedia.translation.13638`, `quranpedia.tafsir.2012`. Readers reject unknown identifiers. The settings form validates choices against `../quranpedia-editions.ts`; there are no provider-alias mappings. Reciters use `quranpedia/{id}` and surah/ayah audio addressing.

The catalogue offers two Hafs scripts, eight English translations and seven Arabic tafsirs. Quranpedia's mushaf 11 currently has plain text without color annotations, so colored Tajweed is not offered and no annotation parser is retained.

The main Hafs reader presents mushaf 1 in the original responsive flowing layout, and mushaf 2 as separate, centered verse rows using Quranpedia's UthmanicHafs_V22 font through `/api/quran/hafs-font`. These are responsive text layouts, not facsimiles or fixed printed line breaks. Both retain the same interactive verse components, translations and audio. Settings include an immediate preview of each presentation. Warsh keeps its own typography and layout.

Tafsir books are presented as general commentary, not certified riwayah-specific editions. Checked on 2026-10-01: Quranpedia's Warsh-labelled books 14052 and 20377 have PDF attachments but no `contents_url`; a verse request for book 14052 returned empty content. Do not add them to the verse reader or label other books Hafs-only/Warsh-only without verifying structured content and editorial scope. Mapping verse boundaries does not adapt a book's discussion of variant readings.

## Database and offline library

New database defaults select Quranpedia resources. Migration `0023_quranpedia_editions.sql` changes defaults and resets unsupported edition/reciter selections to valid Quranpedia defaults. It does not require deleting users or other application records. Pre-production bootstrap migrations and their snapshots also use these defaults. Run `bun run db:migrate` to apply pending migrations to an existing database.

Offline datasets and `public/sw.js` share version `2026.10.01.2`. The service worker refreshes the library with Quranpedia content and identifiers. Update both version constants together.

## Freshness and validation

Official compressed mushaf downloads fit Next's daily fetch cache. Validated corpora use bounded daily process caches with concurrent-load coalescing and a one-day stale grace period per cache on failure. Search corpora expire daily. Whole translation books avoid per-verse request fan-out. See [Quranpedia's usage policy](https://api.quranpedia.net/#usage-policy).

Validate mushaf IDs, surah and verse order, verse counts, source fields and Hafs correspondence. Hafs has 114 surahs and 6,236 verses; Warsh has 6,214 verses. Translation books must map every Hafs verse exactly once. Upstream HTML is converted to inert text while retaining paragraphs and notes.

## Verification

- `bun test scripts/quranpedia-data.test.mjs scripts/quranpedia-reader.test.mjs scripts/quranpedia-reciters.test.mjs`
- `bun scripts/verify-quranpedia.mjs` (live public network reads)
- `bunx tsc --noEmit`

Response fixtures in `scripts/fixtures/quranpedia.json` come from [Quranpedia](https://quranpedia.net), with source versions recorded in the fixture. Tests synthesize full-size corpora around these samples; production uses upstream content.
