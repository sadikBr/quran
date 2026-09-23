import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/features/auth/auth";
import getPreferences from "@/features/settings/server/get-preferences";
import getAyahAudioStreams from "../helpers/get-ayah-audio-streams";
import getAyah from "../server/get-ayah";
import getAvailableQuranEditions from "../server/get-quran-edition";
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
    const [preferences, session] = await Promise.all([
        getPreferences(),
        auth.api.getSession({ headers: await headers() }),
    ]);
    const { ayahs, surahMeta } = await getSurahData(
        String(surahNumber),
        preferences.arabicEdition,
    );
    const ayah = ayahs.find((item) => item.numberInSurah === ayahNumber);

    if (!ayah) {
        notFound();
    }

    const [tafsirAyah, tafsirEditions] = await Promise.all([
        getAyah(ayah.number),
        session
            ? getAvailableQuranEditions().then((editions) =>
                  editions.filter((edition) => edition.type === "tafsir"),
              )
            : [],
    ]);

    return (
        <AyahActions
            surahName={surahMeta.englishName}
            ayahNumber={ayahNumber}
            arabicText={ayah.text}
            tafsirText={tafsirAyah.text}
            tafsirEditionName={
                tafsirAyah.edition.englishName || tafsirAyah.edition.name
            }
            tafsirEditionIdentifier={tafsirAyah.edition.identifier}
            tafsirDirection={tafsirAyah.edition.direction}
            audioStreams={getAyahAudioStreams(ayah)}
            globalAyahNumber={ayah.number}
            tafsirEditions={tafsirEditions}
            canChooseTafsir={Boolean(session)}
            closeOnCopy={closeOnCopy}
        />
    );
}
