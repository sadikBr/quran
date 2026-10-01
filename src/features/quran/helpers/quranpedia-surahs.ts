import { z } from "zod";
import labels from "../data/surah-labels.en.json";
import type { SurahType } from "../types";

const surahsSchema = z
    .array(
        z.object({
            id: z.number().int().min(1).max(114),
            name: z.string().min(1),
            number_of_ayahs: z.number().int().positive(),
            first_page: z.number().int().min(1).max(604),
            revelation_type: z.enum(["مكية", "مدنية"]),
        }),
    )
    .length(114);

export function parseQuranpediaSurahs(value: unknown): SurahType[] {
    const surahs = surahsSchema.parse(value);
    if (
        surahs.some((surah, i) => surah.id !== i + 1) ||
        surahs.reduce((total, surah) => total + surah.number_of_ayahs, 0) !==
            6236
    )
        throw new Error("Incomplete Quranpedia surah index.");
    return surahs.map((surah, index) => ({
        number: surah.id,
        name: surah.name,
        englishName: labels[index].name,
        englishNameTranslation: labels[index].meaning,
        numberOfAyahs: surah.number_of_ayahs,
        startingPage: surah.first_page,
        revelationType: surah.revelation_type === "مكية" ? "Meccan" : "Medinan",
    }));
}

/** Quranpedia's base Hafs mushaf numbers its verses consecutively. */
export function createHafsReference(surahs: SurahType[]) {
    const offsets: number[] = [0];
    for (const surah of surahs)
        offsets.push(offsets[offsets.length - 1] + surah.numberOfAyahs);
    return (surah: number, ayah: number) => {
        const chapter = surahs[surah - 1];
        if (
            !Number.isInteger(surah) ||
            !chapter ||
            !Number.isInteger(ayah) ||
            ayah < 1 ||
            ayah > chapter.numberOfAyahs
        )
            throw new Error("Invalid Quran verse reference.");
        return offsets[surah - 1] + ayah;
    };
}
