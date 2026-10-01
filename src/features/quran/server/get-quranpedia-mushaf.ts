import "server-only";
import { z } from "zod";
import {
    parseQuranpediaMushaf,
    type QuranpediaMushaf,
} from "../helpers/quranpedia-data";
import fetchQuranpedia, { createQuranpediaCache } from "./fetch-quranpedia";

import getQuranpediaSurahs from "./get-quranpedia-surahs";

const cached = createQuranpediaCache<QuranpediaMushaf>(3);

export default function getQuranpediaMushaf(id: 1 | 2 | 4) {
    return cached(String(id), async () => {
        // Official compact downloads avoid repeatedly transferring the much
        // larger JSON API payload and fit Next's persistent fetch cache.
        const dump = z
            .object({
                license: z.object({ version: z.string() }),
                data: z.unknown(),
            })
            .parse(await fetchQuranpedia(`/dumps/mushafs-${id}.json.gz`));
        return parseQuranpediaMushaf(
            dump.data,
            id,
            await getQuranpediaSurahs(),
        );
    });
}
