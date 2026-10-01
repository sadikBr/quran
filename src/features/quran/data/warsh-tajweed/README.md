# Experimental Warsh colour annotations

Generated with [Quranic Phonemizer](https://github.com/QUD-Technologies/quranic-phonemizer), MIT, copyright Ahmed Ibrahim (licence included), pinned to `f280f65e2ebca2c3096b620db021952a58d2ec9f`.

Scope: Warsh through al-Azraq, upstream default variant choices, starting and stopping at every native Warsh ayah. These are generated aids, not a certified publisher's Tajweed edition. Colours do not model continuous recitation across verse boundaries. No rules are inferred from Hafs. Ordinary izhar/tafkhim/tarqiq and implementation-only boundary operations are deliberately left uncoloured.

The reader continues to use Quranpedia mushaf 4. Bundled data contains only derived annotations and SHA-256 text checksums, not the third-party text/font. The source corpus/font's original download URL and licence are not recorded upstream; neither is redistributed here. Annotations are aligned to Quranpedia dump version 2026-09-29 using NFD and ignoring spacing, direction markers and ornamental division characters; marks and letters must otherwise agree. Offsets are then mapped onto the unchanged Quranpedia text, expanded to whole base/diacritic clusters, and checked against the exact text hash at runtime. Multiple rules on a cluster appear together in its tooltip.

6,213 of 6,214 verses generated successfully. **67:10 is omitted** because its text differs; it remains plain. See `report.json`. Upstream's older status report mentions additional blockers, but those were not reproduced by this source-view generation run. This is a mechanical compatibility check, not scholarly certification.

To regenerate, check out the pinned upstream commit in an isolated directory, install its PyYAML dependency there, obtain Quranpedia's mushaf-4 gzip dump, and run from the application repository:

```sh
PYTHONPATH=/path/to/quranic-phonemizer python scripts/generate-warsh-tajweed.py /path/to/mushaf-4.json.gz
```

Review the report and updated annotations before shipping. No Python runtime or upstream requests are required by the deployed app. Users enable or disable this independently of their Hafs presentation in Settings → Arabic text → Warsh — Colour Tajweed (experimental). The database default is off.
