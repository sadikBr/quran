import type { Edition } from "./types";

// Editions use their Quranpedia resource type and native resource ID.
export const MUSHAF_EDITIONS: Record<string, number> = {
    "quranpedia.mushaf.1": 1,
    "quranpedia.mushaf.2": 2,
};

export const TRANSLATION_EDITIONS: Record<string, number> = {
    "quranpedia.translation.13638": 13638,
    "quranpedia.translation.1948": 1948,
    "quranpedia.translation.13604": 13604,
    "quranpedia.translation.13605": 13605,
    "quranpedia.translation.13640": 13640,
    "quranpedia.translation.13644": 13644,
    "quranpedia.translation.13645": 13645,
    "quranpedia.translation.13661": 13661,
};

export const TAFSIR_EDITIONS: Record<string, number> = {
    "quranpedia.tafsir.2012": 2012,
    "quranpedia.tafsir.272": 272,
    "quranpedia.tafsir.363": 363,
    "quranpedia.tafsir.321": 321,
    "quranpedia.tafsir.2": 2,
    "quranpedia.tafsir.3": 3,
    "quranpedia.tafsir.4": 4,
};

function edition(
    identifier: string,
    name: string,
    englishName: string,
    type: string,
    language = "ar",
): Edition {
    return {
        identifier,
        name,
        englishName,
        type,
        language,
        format: "text",
        direction: language === "ar" ? "rtl" : "ltr",
    };
}

export const QURANPEDIA_EDITIONS: Edition[] = [
    edition(
        "quranpedia.mushaf.1",
        "حفص — عرض المصحف",
        "Hafs — Mushaf view",
        "quran",
    ),
    edition(
        "quranpedia.mushaf.2",
        "حفص — عرض الآيات بالخط العثماني",
        "Hafs — Uthmani verse view",
        "quran",
    ),
    ...[
        ["quranpedia.translation.13638", "Saheeh International"],
        ["quranpedia.translation.1948", "Hilali & Khan"],
        ["quranpedia.translation.13604", "Pickthall"],
        ["quranpedia.translation.13605", "Yusuf Ali"],
        ["quranpedia.translation.13640", "Abul Ala Maududi"],
        ["quranpedia.translation.13644", "Abdul Haleem"],
        ["quranpedia.translation.13645", "Mufti Taqi Usmani"],
        ["quranpedia.translation.13661", "Mustafa Khattab — The Clear Quran"],
    ].map(([id, name]) => edition(id, name, name, "translation", "en")),
    ...[
        ["quranpedia.tafsir.2012", "التفسير الميسر", "Al-Muyassar"],
        ["quranpedia.tafsir.272", "تفسير الجلالين", "Al-Jalalayn"],
        [
            "quranpedia.tafsir.363",
            "تنوير المقباس من تفسير ابن عباس",
            "Tanwir al-Miqbas",
        ],
        ["quranpedia.tafsir.321", "التفسير الوسيط", "Al-Waseet"],
        ["quranpedia.tafsir.2", "معالم التنزيل", "Al-Baghawi"],
        ["quranpedia.tafsir.3", "تيسير الكريم الرحمن", "As-Sa'di"],
        ["quranpedia.tafsir.4", "جامع البيان في تأويل آي القرآن", "At-Tabari"],
    ].map(([id, name, english]) => edition(id, name, english, "tafsir")),
];

export function getQuranpediaEdition(identifier: string): Edition {
    const value = QURANPEDIA_EDITIONS.find(
        (item) => item.identifier === identifier,
    );
    if (!value) throw new Error("That Quran edition is not available.");
    return value;
}
