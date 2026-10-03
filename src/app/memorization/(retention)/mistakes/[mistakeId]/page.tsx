import { notFound, redirect } from "next/navigation";
import { isMemorized } from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import MistakePractice from "@/features/retention/components/mistake-practice";
import { learnerContext } from "@/features/retention/server/context";
import { listMistakes } from "@/features/retention/server/mistakes";
import { retentionState } from "@/features/retention/server/state";
import { exerciseVerses } from "@/features/retention/server/verses";

export default async function MistakePracticePage({
    params,
}: {
    params: Promise<{ mistakeId: string }>;
}) {
    const { userId } = await learnerContext(),
        { mistakeId } = await params;
    const catalogue = await getMemoryCatalogue();
    const state = await retentionState(userId, catalogue, "UTC", new Date());
    const item = (await listMistakes(userId, catalogue, state.covered)).find(
        (m) => m.id === mistakeId,
    );
    if (!item) notFound();
    if (!item.memorized || item.resolvedAt) redirect("/memorization/mistakes");
    const passage = catalogue[item.riwayah].filter(
        (v) =>
            v.surahNumber === item.surahNumber &&
            v.ayahNumber >= item.ayahNumber &&
            v.ayahNumber <= item.ayahNumber + 2,
    );
    const known = passage.slice(
        0,
        passage.findIndex((v) => !isMemorized(v, state.covered)) < 0
            ? passage.length
            : passage.findIndex((v) => !isMemorized(v, state.covered)),
    );
    const ayahs = new Set(known.map((v) => v.ayahNumber));
    const verses = (await exerciseVerses(item.riwayah)).filter(
        (v) => v.surahNumber === item.surahNumber && ayahs.has(v.ayahNumber),
    );
    return (
        <MistakePractice
            key={`${item.id}:${item.revision}`}
            item={item}
            verses={verses}
        />
    );
}
