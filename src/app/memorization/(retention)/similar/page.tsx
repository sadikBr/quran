import { isMemorized } from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import getQuranCorpus from "@/features/quran/server/get-quran-corpus";
import SimilarExercises from "@/features/retention/components/similar-exercises";
import { learnerContext } from "@/features/retention/server/context";
import { retentionState } from "@/features/retention/server/state";

export default async function SimilarPage() {
    const { userId, preferences } = await learnerContext();
    const [catalogue, corpus] = await Promise.all([
        getMemoryCatalogue(),
        getQuranCorpus(),
    ]);
    const state = await retentionState(userId, catalogue, "UTC", new Date());
    const supported = new Set(
        catalogue.hafs
            .filter((v) =>
                corpus.surahs[v.surahNumber - 1].ayahs[
                    v.ayahNumber - 1
                ].studyOptions?.includes("similar"),
            )
            .flatMap((v) => v.atoms),
    );
    const candidates = catalogue[preferences.riwayah]
        .filter(
            (v) =>
                isMemorized(v, state.covered) &&
                v.atoms.some((a) => supported.has(a)),
        )
        .map((v) => ({
            surahNumber: v.surahNumber,
            ayahNumber: v.ayahNumber,
            label:
                preferences.language === "ar"
                    ? corpus.surahs[v.surahNumber - 1].name
                    : corpus.surahs[v.surahNumber - 1].englishName,
        }));
    return (
        <SimilarExercises
            key={preferences.riwayah}
            candidates={candidates}
            riwayah={preferences.riwayah}
        />
    );
}
