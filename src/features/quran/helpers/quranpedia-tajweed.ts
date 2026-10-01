import warshRules from "../data/warsh-tajweed/rules.json";

export const TAJWEED_RULES = {
    ...warshRules,
    ghunnah: ["غنة", "Ghunnah"],
    qalaqah: ["قلقلة", "Qalqalah"],
    "idgham-with-ghunnah": ["إدغام بغنة", "Idgham with ghunnah"],
    "idgham-without-ghunnah": ["إدغام بغير غنة", "Idgham without ghunnah"],
    "idgham-shafawi": ["إدغام شفوي", "Shafawi idgham"],
    "idgham-mutajanisayn": ["إدغام متجانسين", "Mutajanisayn idgham"],
    ikhafa: ["إخفاء", "Ikhfa"],
    "ikhafa-shafawi": ["إخفاء شفوي", "Shafawi ikhfa"],
    iqlab: ["إقلاب", "Iqlab"],
    "madda-normal": ["مد طبيعي", "Natural madd"],
    "madda-permissible": ["مد جائز منفصل", "Separate madd"],
    "madda-obligatory": ["مد واجب متصل", "Connected madd"],
    "madda-necessary": ["مد لازم", "Necessary madd"],
    silent: ["حرف لا يلفظ", "Silent letter"],
    "laam-shamsiyah": ["لام شمسية", "Sun-letter lam"],
    "hamza-wasl": ["همزة وصل", "Hamzat al-wasl"],
} as const;
export type TajweedRule = keyof typeof TAJWEED_RULES;
export type TajweedSegment = {
    text: string;
    rule?: TajweedRule;
    rules?: TajweedRule[];
};

export function parseTajweedVerse(markup: string): TajweedSegment[] {
    const segments: TajweedSegment[] = [];
    let rule: TajweedRule | undefined;
    for (const token of markup.trim().split(/(<[^>]*>)/u)) {
        if (!token) continue;
        if (token.startsWith("<")) {
            if (token === "</tajweed>" && rule) rule = undefined;
            else {
                const match = token.match(
                    /^<tajweed\s+class="[\w-]+"\s+data-type="([\w-]+)">$/u,
                );
                if (
                    !match ||
                    rule ||
                    match[1].startsWith("warsh-") ||
                    !Object.hasOwn(TAJWEED_RULES, match[1])
                )
                    throw new Error("Unsupported Quranpedia Tajweed markup.");
                rule = match[1] as TajweedRule;
            }
        } else {
            // No HTML is ever executed or inserted into the reader.
            if (/[<&>]/u.test(token))
                throw new Error("Unexpected Tajweed text.");
            segments.push({ text: token, ...(rule ? { rule } : {}) });
        }
    }
    if (rule) throw new Error("Incomplete Tajweed annotation.");
    return segments;
}

export function parseTajweedChapter(
    html: string,
    surah: number,
    texts: string[],
) {
    const verses = new Map<number, TajweedSegment[]>();
    for (const match of html.matchAll(
        /<a\s+class="ayah"([^>]*)>([\s\S]*?)<span class="marker">[^<]*<\/span>\s*<\/a>/gu,
    )) {
        const number = Number(match[1].match(/\bayah="(\d+)"/u)?.[1]);
        const chapter = Number(match[1].match(/\bsurah="(\d+)"/u)?.[1]);
        if (chapter !== surah || !texts[number - 1] || verses.has(number))
            throw new Error("Invalid Tajweed verse reference.");
        const segments = parseTajweedVerse(match[2]);
        const normalize = (text: string) =>
            text.replace(/[\s\uFEFF۞ـ]/gu, "").normalize("NFC");
        if (
            normalize(segments.map((s) => s.text).join("")) !==
            normalize(texts[number - 1])
        )
            throw new Error(
                "Tajweed text does not match Quranpedia's Hafs text.",
            );
        verses.set(number, segments);
    }
    if (verses.size !== texts.length)
        throw new Error("Incomplete Tajweed chapter.");
    return verses;
}
