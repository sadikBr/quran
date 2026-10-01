import { z } from "zod";
import type { AyahType, Edition, SurahType } from "../types";
import { createHafsReference } from "./quranpedia-surahs";

export const quranpediaMushafSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    bismillah: z.string(),
    font_file: z.string().nullable(),
    images: z.string().nullable().optional(),
    images_png: z.string().nullable().optional(),
    surahs: z
        .array(
            z.object({
                id: z.number().int().min(1).max(114),
                name: z.string(),
                coded_name: z.string(),
                ayahs: z
                    .array(
                        z.object({
                            id: z.number().int().positive(),
                            number: z.number().int().positive(),
                            surah: z.coerce.string(),
                            page_number: z.number().int().min(1).max(604),
                            text: z.string().min(1),
                            marker: z.string(),
                            juz: z.number().int().min(0).max(30),
                            hizb: z.number().int().min(0).max(240),
                            ruku: z.number().int().nonnegative(),
                            manzil: z.number().int().min(0).max(7),
                            options: z.array(z.string()),
                            number_in_hafs: z
                                .array(z.number().int().positive())
                                .min(1),
                        }),
                    )
                    .min(1),
            }),
        )
        .length(114),
});

export type QuranpediaMushaf = z.infer<typeof quranpediaMushafSchema>;
export interface QuranCorpus {
    edition: Edition;
    surahs: Array<SurahType & { ayahs: AyahType[] }>;
}

export function parseQuranpediaMushaf(
    value: unknown,
    id: number,
    surahs: SurahType[],
): QuranpediaMushaf {
    const hafsGlobalNumber = createHafsReference(surahs);
    const mushaf = quranpediaMushafSchema.parse(value);
    if (mushaf.id !== id) throw new Error("Unexpected Quranpedia mushaf.");
    const count = mushaf.surahs.reduce(
        (total, surah) => total + surah.ayahs.length,
        0,
    );
    if (count !== (id === 4 ? 6214 : 6236))
        throw new Error("Incomplete Quranpedia mushaf.");
    const ids = new Set<number>();
    for (const [index, surah] of mushaf.surahs.entries()) {
        if (surah.id !== index + 1)
            throw new Error("Incomplete Quranpedia surahs.");
        if (id !== 4 && surah.ayahs.length !== surahs[index].numberOfAyahs)
            throw new Error("Incomplete Hafs surah.");
        for (const [ayahIndex, ayah] of surah.ayahs.entries()) {
            if (
                ayah.number !== ayahIndex + 1 ||
                Number(ayah.surah) !== surah.id ||
                ids.has(ayah.id)
            )
                throw new Error("Invalid Quranpedia verse order.");
            ids.add(ayah.id);
            if (id === 1 && ayah.id !== hafsGlobalNumber(surah.id, ayah.number))
                throw new Error("Invalid Quranpedia Hafs identity.");
            for (const mapped of ayah.number_in_hafs)
                hafsGlobalNumber(surah.id, mapped);
        }
    }
    return mushaf;
}

export function normalizeHafsMushaf(
    mushaf: QuranpediaMushaf,
    edition: Edition,
    surahs: SurahType[],
): QuranCorpus {
    const hafsGlobalNumber = createHafsReference(surahs);
    let juz = 1;
    let hizbQuarter = 1;
    let ruku = 1;
    let manzil = 1;
    return {
        edition,
        surahs: mushaf.surahs.map((chapter) => {
            const surah = {
                ...surahs[chapter.id - 1],
                startingPage: chapter.ayahs[0].page_number,
            };
            return {
                ...surah,
                ayahs: chapter.ayahs.map((verse): AyahType => {
                    const number = hafsGlobalNumber(chapter.id, verse.number);
                    if (verse.juz > 0) juz = verse.juz;
                    if (verse.hizb > 0) hizbQuarter = verse.hizb;
                    if (verse.ruku > 0) ruku = verse.ruku;
                    if (verse.manzil > 0) manzil = verse.manzil;
                    return {
                        number,
                        numberInSurah: verse.number,
                        surah,
                        text: verse.text.replace(/\uFEFF/g, ""),
                        studyOptions: verse.options,
                        page: verse.page_number,
                        juz,
                        hizbQuarter,
                        ruku,
                        manzil,
                        sajda: verse.text.includes("۩"),
                    };
                }),
            };
        }),
    };
}

/** Render upstream rich text as inert text, preserving paragraphs and notes. */
export function quranpediaPlainText(value: string) {
    const entities: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
        ndash: "–",
        mdash: "—",
        hellip: "…",
    };
    return value
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])\s*>/gi, "\n")
        .replace(/<(?:"[^"]*"|'[^']*'|[^'">])*>/g, "")
        .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
            if (entity[0] !== "#")
                return entities[entity.toLowerCase()] ?? match;
            const code =
                entity[1].toLowerCase() === "x"
                    ? Number.parseInt(entity.slice(2), 16)
                    : Number(entity.slice(1));
            return code > 0 &&
                code <= 0x10ffff &&
                !(code >= 0xd800 && code <= 0xdfff)
                ? String.fromCodePoint(code)
                : match;
        })
        .replace(/\uFEFF/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const translationSchema = z.object({
    id: z.number().int(),
    ayahs: z
        .array(
            z.object({
                surah_number: z.number().int().min(1).max(114),
                ayah_number: z.number().int().positive(),
                translated_text: z.string().min(1),
            }),
        )
        .length(6236),
});

export function normalizeQuranpediaTranslation(
    value: unknown,
    id: number,
    hafs: QuranCorpus,
    edition: Edition,
): QuranCorpus {
    const hafsGlobalNumber = createHafsReference(hafs.surahs);
    const translation = translationSchema.parse(value);
    if (translation.id !== id)
        throw new Error("Unexpected Quranpedia translation.");
    const texts = new Map<number, string>();
    for (const ayah of translation.ayahs) {
        const number = hafsGlobalNumber(ayah.surah_number, ayah.ayah_number);
        const text = quranpediaPlainText(ayah.translated_text);
        if (texts.has(number) || !text)
            throw new Error("Invalid Quranpedia translation verse.");
        texts.set(number, text);
    }
    return {
        edition,
        surahs: hafs.surahs.map((surah) => ({
            ...surah,
            ayahs: surah.ayahs.map((ayah) => {
                const text = texts.get(ayah.number);
                if (!text)
                    throw new Error("Incomplete Quranpedia translation.");
                return { ...ayah, text };
            }),
        })),
    };
}
