import "server-only";

import { z } from "zod";
import getPreferences from "@/features/settings/server/get-preferences";
import { quranpediaPlainText } from "../helpers/quranpedia-data";
import { getQuranpediaEdition, TAFSIR_EDITIONS } from "../quranpedia-editions";
import type { AyahData } from "../types";
import fetchQuranpedia from "./fetch-quranpedia";
import getQuranCorpus from "./get-quran-corpus";

const tafsirSchema = z.object({
    book: z.object({ id: z.number().int() }),
    content: z.array(z.object({ text: z.string() })),
});

export default async function getAyah(
    globalAyahNumber: number,
    editionIdentifier?: string,
): Promise<AyahData> {
    if (
        !Number.isInteger(globalAyahNumber) ||
        globalAyahNumber < 1 ||
        globalAyahNumber > 6236
    )
        throw new Error("Invalid Quran verse.");
    const preferences = editionIdentifier ? null : await getPreferences();
    const edition = getQuranpediaEdition(
        editionIdentifier ??
            preferences?.tafsirEdition ??
            "quranpedia.tafsir.2012",
    );
    const corpus = await getQuranCorpus(
        edition.type === "tafsir" ? "quranpedia.mushaf.1" : edition.identifier,
    );
    const ayah = corpus.surahs
        .flatMap((surah) => surah.ayahs)
        .find((item) => item.number === globalAyahNumber);
    if (!ayah) throw new Error("Quran verse not found.");
    if (edition.type !== "tafsir") return { ...ayah, edition };
    const book = TAFSIR_EDITIONS[edition.identifier];
    const response = tafsirSchema.parse(
        await fetchQuranpedia(
            `/v1/ayah/${ayah.surah.number}/${ayah.numberInSurah}/book/${book}`,
        ),
    );
    if (response.book.id !== book)
        throw new Error("Unexpected Quranpedia tafsir.");
    const text = response.content
        .map((item) => quranpediaPlainText(item.text))
        .filter(Boolean)
        .join("\n\n");
    return { ...ayah, text, edition };
}
