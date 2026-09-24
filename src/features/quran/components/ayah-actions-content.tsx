import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/features/auth/auth";
import getSavedAyah from "@/features/saved-ayahs/server/get-saved-ayah";
import getPreferences from "@/features/settings/server/get-preferences";
import { stripBasmalaPrefix } from "../helpers/basmala";
import getAyahAudioStreams from "../helpers/get-ayah-audio-streams";
import getAyah from "../server/get-ayah";
import getAvailableQuranEditions from "../server/get-quran-edition";
import getSurahData from "../server/get-surah";
import AyahActions from "./ayah-actions";
import { getPlainQuranText } from "./tajweed-text";

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

    const arabicText =
        ayah.numberInSurah === 1 && surahNumber !== 1
            ? stripBasmalaPrefix(ayah.text)
            : ayah.text;

    const [tafsirAyah, tafsirEditions, savedAyah] = await Promise.all([
        getAyah(ayah.number),
        session
            ? getAvailableQuranEditions().then((editions) =>
                  editions.filter((edition) => edition.type === "tafsir"),
              )
            : [],
        session ? getSavedAyah(session.user.id, ayah.number) : null,
    ]);

    return (
        <AyahActions
            surahName={surahMeta.englishName}
            ayahNumber={ayahNumber}
            arabicText={arabicText}
            tafsirText={tafsirAyah.text}
            tafsirEditionName={
                tafsirAyah.edition.englishName || tafsirAyah.edition.name
            }
            tafsirEditionIdentifier={tafsirAyah.edition.identifier}
            tafsirDirection={tafsirAyah.edition.direction}
            audioStreams={getAyahAudioStreams(ayah)}
            globalAyahNumber={ayah.number}
            surahNumber={surahNumber}
            pageNumber={ayah.page}
            tafsirEditions={tafsirEditions}
            canChooseTafsir={Boolean(session)}
            canSaveAyah={Boolean(session)}
            initialBookmarked={savedAyah?.isBookmarked ?? false}
            initialReflection={savedAyah?.reflection ?? ""}
            plainArabicText={getPlainQuranText(arabicText)}
            closeOnCopy={closeOnCopy}
        />
    );
}
