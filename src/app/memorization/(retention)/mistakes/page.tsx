import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import MistakeNotebook from "@/features/retention/components/mistake-notebook";
import { learnerContext } from "@/features/retention/server/context";
import { listMistakes } from "@/features/retention/server/mistakes";
import { retentionState } from "@/features/retention/server/state";

export default async function MistakesPage() {
    const { userId, preferences } = await learnerContext();
    const [catalogue, surahs] = await Promise.all([
        getMemoryCatalogue(),
        getSurahsMeta(),
    ]);
    const state = await retentionState(userId, catalogue, "UTC", new Date());
    return (
        <MistakeNotebook
            defaultRiwayah={preferences.riwayah}
            items={await listMistakes(userId, catalogue, state.covered)}
            surahs={surahs.map((s) => ({
                number: s.number,
                name: s.name,
                englishName: s.englishName,
                hafs: catalogue.hafs.filter((v) => v.surahNumber === s.number)
                    .length,
                warsh: catalogue.warsh.filter((v) => v.surahNumber === s.number)
                    .length,
            }))}
        />
    );
}
