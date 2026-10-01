import "server-only";

import type { Riwayah } from "@/features/settings/preferences";
import { getQuranpediaEdition } from "../quranpedia-editions";
import getAyah from "./get-ayah";
import getReaderReferences from "./get-reader-references";

export default async function getReaderTafsir(
    surahNumber: number,
    ayahNumber: number,
    riwayah: Riwayah,
    editionIdentifier: string,
) {
    if (getQuranpediaEdition(editionIdentifier).type !== "tafsir") {
        throw new Error("That tafsir edition is not available.");
    }

    const mapped = await getReaderReferences(surahNumber, ayahNumber, riwayah);
    const commentary = await Promise.all(
        mapped.map((ayah) => getAyah(ayah.number, editionIdentifier)),
    );
    // A book may return the same passage for several adjacent verses.
    return {
        ...commentary[0],
        text: [
            ...new Set(commentary.map((item) => item.text).filter(Boolean)),
        ].join("\n\n"),
    };
}
