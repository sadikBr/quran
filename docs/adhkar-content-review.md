# Bundled adhkar content, version 2

## Provenance and permission

Arabic excerpts are from Islamic Pro Azkar API, revision
`d793023e3b69c91674023f692425950c8ebbb64d`, retrieved 2026-09-29:
https://github.com/YousefAsalya/Islamic-Pro-azkar-API/tree/d793023e3b69c91674023f692425950c8ebbb64d

The repository distributes the dataset under MIT. Its full copyright and permission notice is retained in `src/features/adhkar/data/LICENSE` and `/legal/adhkar.txt`. No audio or translation is redistributed. This records the publisher's stated grant, not independent legal verification of every upstream contribution.

## Review scope

This is an editorial/structural review against the pinned source, **not a scholarly authentication or grading of every narration**. Original source text is retained on every entry and displayed in expandable details. Runtime code performs no text rewriting or repetition inference. Changes require an explicit dataset edit and tests.

- Morning/evening: source instructions determine the six evening variants (77, 78, 80, 81, 89, 90). Only the explicitly instructed words are substituted; morning wording is retained otherwise. Morning-only entries 93–95 and evening-only 97 are excluded from the opposite collection. Entry 96 retains its **daily**, not per-session, instruction.
- Source entry 83: seven repetitions explicitly stated in the Arabic instruction override metadata `1`.
- Three surahs in 76: split into individual entries, each with count 3.
- Sleep 106: three separate counters 33/33/34, checked against https://sunnah.com/muslim:2727a.
- After salah 66: separate seeking-forgiveness (3) and following supplication (1), checked against https://sunnah.com/muslim:591.
- After salah 69: 33/33/33 and concluding phrase once, checked against https://sunnah.com/muslim:597a.
- After salah 67: separate the first phrase (3) from the following supplication (1), following the source's bracketed instruction; not independently graded.
- Sleep 99: action instructions are separate from the recited text; repeat the full routine three times as the source instructs.
- Other uncomplicated entries retain source counts. `countBasis: source-metadata` distinguishes these from text/reference-checked counts in the reader.

## Explicit review flags (no forced count)

- 92: source offers alternatives (ten, or once); retain instructions without choosing for the reader.
- 104: source metadata says once without an explicit textual repetition instruction. Further count review needed.
- 110: instruction to read the two surahs, not their full text. Display it as an instruction, without pretending the instruction itself is the recitation.
- 70: after-prayer surahs need prayer-specific count review. Preserve source text and avoid a universal target.

The listed flags are visible in the UI. Prayer-specific restrictions in 72/73 remain visible as instructions. Do not silently remove these flags or claim all counts independently verified.

## Identity and progress

Unsplit entries keep the original numeric Hisn ID. Split IDs are `sourceId * 100 + part`, with the original `sourceId` retained. Legacy completion of a source entry expands to its parts; the old cursor maps by source ID, not shifted list position. Version 2 saves stable IDs. Daily progress remains device-local.

## Offline scope

These collections no longer need an external content request. This does **not** by itself cache the Next.js route or add full offline/PWA support.

## Validation

Run `node scripts/adhkar-content.test.mjs`, `node scripts/adhkar-format.test.mjs`, and `npx tsc --noEmit`. Formatting/parser tests cover the import helper only; the production loader imports the bundled JSON directly.
