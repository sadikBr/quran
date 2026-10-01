import "server-only";
import {
    normalizeHafsMushaf,
    normalizeQuranpediaTranslation,
    type QuranCorpus,
} from "../helpers/quranpedia-data";
import {
    getQuranpediaEdition,
    MUSHAF_EDITIONS,
    TRANSLATION_EDITIONS,
} from "../quranpedia-editions";
import fetchQuranpedia, { createQuranpediaCache } from "./fetch-quranpedia";
import getQuranpediaMushaf from "./get-quranpedia-mushaf";

import getQuranpediaSurahs from "./get-quranpedia-surahs";

const cached = createQuranpediaCache<QuranCorpus>(10);

export default function getQuranCorpus(
    identifier = "quranpedia.mushaf.1",
): Promise<QuranCorpus> {
    const edition = getQuranpediaEdition(identifier);
    return cached(edition.identifier, async () => {
        const mushafId = MUSHAF_EDITIONS[edition.identifier];
        if (mushafId === 1 || mushafId === 2)
            return normalizeHafsMushaf(
                await getQuranpediaMushaf(mushafId),
                edition,
                await getQuranpediaSurahs(),
            );
        const translationId = TRANSLATION_EDITIONS[edition.identifier];
        if (!translationId)
            throw new Error("That edition is not a Quran text or translation.");
        const [hafs, translation] = await Promise.all([
            getQuranCorpus(),
            fetchQuranpedia(`/translation-books/${translationId}.json`),
        ]);
        return normalizeQuranpediaTranslation(
            translation,
            translationId,
            hafs,
            edition,
        );
    });
}
