import { notFound } from "next/navigation";
import getPreferences from "@/features/settings/server/get-preferences";
import getSurahData from "../server/get-surah";
import AyahActions from "./ayah-actions";

export default async function AyahActionsContent({
    surahNumber,
    ayahNumber,
    closeOnCopy = false,
}: {
    surahNumber: number;
    ayahNumber: number;
    closeOnCopy?: boolean;
}) {
    const preferences = await getPreferences();
    const { ayahs, surahMeta } = await getSurahData(
        String(surahNumber),
        preferences.arabicEdition,
    );
    const ayah = ayahs.find((item) => item.numberInSurah === ayahNumber);

    if (!ayah) {
        notFound();
    }

    return (
        <AyahActions
            surahName={surahMeta.englishName}
            ayahNumber={ayahNumber}
            arabicText={ayah.text}
            closeOnCopy={closeOnCopy}
        />
    );
}
