import "server-only";

import getPreferences from "@/features/settings/server/get-preferences";
import type { AyahData } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getAyah(
    globalAyahNumber: number,
    editionIdentifier?: string,
): Promise<AyahData> {
    const preferences = editionIdentifier ? null : await getPreferences();
    const edition = editionIdentifier ?? preferences?.tafsirEdition;
    const response = await fetchQuranCloud<{ data: AyahData }>(
        `/ayah/${globalAyahNumber}/${edition}`,
    );

    return response.data;
}
