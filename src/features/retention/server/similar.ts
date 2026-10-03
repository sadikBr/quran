"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { isMemorized } from "@/features/memorization/progress";
import getMemoryCatalogue from "@/features/memorization/server/get-memory-catalogue";
import { quranReferenceSchema } from "@/features/practice/types";
import getAyahStudy from "@/features/quran/server/get-ayah-study";
import {
    memorizedSimilarReferences,
    type SimilarExercise,
    verseWords,
} from "../similar";
import { retentionState } from "./state";
import { exerciseVerses } from "./verses";

export async function loadSimilarExercise(
    input: unknown,
): Promise<
    | { success: true; exercise: SimilarExercise }
    | { success: false; reason: "unavailable" | "empty" | "unknown" }
> {
    const data = quranReferenceSchema
        .extend({ riwayah: z.enum(["hafs", "warsh"]) })
        .safeParse(input);
    const session = await auth.api.getSession({ headers: await headers() });
    if (!data.success || !session || (await isPlatformAdmin(session.user.id)))
        return { success: false, reason: "unknown" };
    try {
        const { riwayah, ...ref } = data.data;
        const catalogue = await getMemoryCatalogue();
        const state = await retentionState(
            session.user.id,
            catalogue,
            "UTC",
            new Date(),
        );
        const native = catalogue[riwayah].find(
            (v) =>
                v.surahNumber === ref.surahNumber &&
                v.ayahNumber === ref.ayahNumber,
        );
        if (!native || !isMemorized(native, state.covered))
            return { success: false, reason: "unknown" };
        const [study, verses] = await Promise.all([
            getAyahStudy({ ...ref, riwayah, section: "similar" }),
            exerciseVerses(riwayah),
        ]);
        if (study.section !== "similar")
            return { success: false, reason: "unavailable" };
        // The external study request can take time; honor grid corrections made while it loads.
        const currentState = await retentionState(
            session.user.id,
            catalogue,
            "UTC",
            new Date(),
        );
        if (!isMemorized(native, currentState.covered))
            return { success: false, reason: "unknown" };
        const matches = memorizedSimilarReferences(
            catalogue,
            riwayah,
            currentState.covered,
            study.groups.flatMap((g) => g.verses),
            ref,
        );
        const keys = new Set(
            matches.map((v) => `${v.surahNumber}:${v.ayahNumber}`),
        );
        const source = verses.find(
            (v) =>
                v.surahNumber === ref.surahNumber &&
                v.ayahNumber === ref.ayahNumber,
        );
        const alternatives = verses
            .filter((v) => keys.has(`${v.surahNumber}:${v.ayahNumber}`))
            .slice(0, 8);
        if (
            !source ||
            verseWords(source.text).length < 2 ||
            !alternatives.length
        )
            return { success: false, reason: "empty" };
        return {
            success: true,
            exercise: {
                source,
                alternatives,
                riwayah,
                sourceUrl: study.sourceUrl,
            },
        };
    } catch {
        return { success: false, reason: "unavailable" };
    }
}
