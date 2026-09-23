import "server-only";

import getPreferences from "@/features/settings/server/get-preferences";
import type { AyahData } from "../types";
import fetchQuranCloud from "./fetch-quran-cloud";

export default async function getAyah(
    globalAyahNumber: number,
): Promise<AyahData> {
    const preferences = await getPreferences();
    const response = await fetchQuranCloud<{ data: AyahData }>(
        `/ayah/${globalAyahNumber}/${preferences.tafsirEdition}`,
    );

    return response.data;
}
