import type { Preferences } from "./preferences";

const catalogKeys = [
    "riwayah",
    "readingMode",
    "arabicEdition",
    "reciter",
    "translationEdition",
    "tafsirEdition",
] as const;
type CatalogSelection = Pick<Preferences, (typeof catalogKeys)[number]>;

export function catalogSelectionChanged(
    previous: CatalogSelection,
    next: CatalogSelection,
) {
    return catalogKeys.some((key) => previous[key] !== next[key]);
}
