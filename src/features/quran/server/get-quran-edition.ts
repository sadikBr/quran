import "server-only";

import { QURANPEDIA_EDITIONS } from "../quranpedia-editions";
import type { Edition } from "../types";

export default async function getAvailableQuranEditions(): Promise<Edition[]> {
    return QURANPEDIA_EDITIONS.map((edition) => ({ ...edition }));
}
