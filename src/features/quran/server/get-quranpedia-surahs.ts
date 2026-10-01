import "server-only";
import { parseQuranpediaSurahs } from "../helpers/quranpedia-surahs";
import type { SurahType } from "../types";
import fetchQuranpedia, { createQuranpediaCache } from "./fetch-quranpedia";

const cached = createQuranpediaCache<SurahType[]>(1);

export default function getQuranpediaSurahs() {
    return cached("surahs", async () =>
        parseQuranpediaSurahs(await fetchQuranpedia("/v1/surahs")),
    );
}
