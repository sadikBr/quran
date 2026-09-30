import type { Reciter } from "../types";

const names: Record<number, string> = {
    361: "Hicham Lharraz",
    1: "Ibrahim Al-Akhdar",
    251: "Ibrahim Al-Akhdar",
    2: "Abu Bakr Al-Shatri",
    3: "Ahmed Al-Ajmi",
    4: "Ahmed Neana",
    5: "Akram Al-Alaqmi",
    7: "Khalid Al-Qahtani",
    8: "Khalifa Al-Tunaiji",
    9: "Saud Al-Shuraim",
    10: "Sahl Yassin",
    11: "Salah Al-Budair",
    12: "Salah Bukhatir",
    13: "Abdul Basit Abdus Samad",
    14: "Abdul Basit Abdus Samad (Mujawwad)",
    16: "Abdurrahman Al-Sudais",
    17: "Abdullah Al-Matroud",
    18: "Abdullah Basfar",
    253: "Abdullah Basfar",
    19: "Abdullah Al-Juhany",
    20: "Abdul Muhsin Al-Qasim",
    21: "Ali Al-Hudhaify",
    254: "Ali Al-Hudhaify",
    22: "Ali Jaber",
    23: "Ali Hajjaj Al-Suwaisi",
    24: "Fares Abbad",
    25: "Nasser Al-Qatami",
    26: "Hani Al-Rifai",
    27: "Yasser Al-Dossari",
    28: "Maher Al-Muaiqly",
    29: "Muhammad Al-Tablawi",
    30: "Muhammad Ayyoub",
    249: "Muhammad Ayyoub",
    31: "Muhammad Jibreel",
    32: "Muhammad Siddiq Al-Minshawi",
    33: "Muhammad Siddiq Al-Minshawi (Mujawwad)",
    248: "Muhammad Siddiq Al-Minshawi",
    34: "Muhammad Abdul Karim",
    35: "Mahmoud Khalil Al-Husary",
    36: "Mahmoud Khalil Al-Husary (Mujawwad)",
    41: "Mahmoud Khalil Al-Husary (Teaching)",
    37: "Mahmoud Ali Al-Banna",
    38: "Mishary Rashid Alafasy",
    255: "Mishary Rashid Alafasy",
    39: "Yasser Salama",
    256: "Miftah Muhammad Al-Sultani",
    261: "Mahmoud Khalil Al-Husary",
    262: "Abdul Basit Abdus Samad",
    263: "Yassine Al-Jazayri",
    264: "Abdul Karim Al-Daghouch",
    265: "Laayoun El Kouchi",
    266: "Rachid Belalia",
    267: "Muhammad Abdul Karim",
};

interface Entry {
    id: number;
    name: string;
    server: string;
    rawi: { name: string };
    classification: { id: number };
    surahs_list: number[];
}

export function parseQuranpediaReciters(data: unknown): Reciter[] {
    if (!Array.isArray(data)) throw new Error("Invalid Quranpedia catalog");
    const reciters: Reciter[] = [];
    for (const group of data) {
        if (!Array.isArray(group)) continue;
        const englishName = group
            .map((entry: Entry) => names[entry.id])
            .find(Boolean);
        for (const entry of group as Entry[]) {
            if (
                !Number.isInteger(entry.id) ||
                typeof entry.name !== "string" ||
                typeof entry.server !== "string" ||
                !Array.isArray(entry.surahs_list)
            )
                continue;
            const riwayah =
                entry.rawi?.name === "ورش"
                    ? "warsh"
                    : entry.rawi?.name === "حفص"
                      ? "hafs"
                      : null;
            if (!riwayah || ![1, 2].includes(entry.classification?.id))
                continue;
            const base = new URL(entry.server);
            if (base.protocol !== "https:") continue;
            const scope = entry.classification.id === 2 ? "ayah" : "surah";
            reciters.push({
                id: `quranpedia/${entry.id}`,
                host: "quranpedia",
                scope,
                name: `${names[entry.id] ?? englishName ?? entry.name} · ${riwayah === "warsh" ? "Warsh" : "Hafs"}`,
                arabicName: entry.name,
                recitation: riwayah,
                url: `${entry.server.replace(/\/+$/, "")}/{surah:03d}${scope === "ayah" ? "{ayah:03d}" : ""}.mp3`,
                surah_total: 114,
                availableSurahs: [
                    ...new Set(
                        entry.surahs_list.filter(
                            (n) => Number.isInteger(n) && n >= 1 && n <= 114,
                        ),
                    ),
                ],
            });
        }
    }
    if (
        !reciters.some((r) => r.id === "quranpedia/263") ||
        !reciters.some((r) => r.id === "quranpedia/255")
    )
        throw new Error("Incomplete Quranpedia catalog");
    return reciters;
}

export function migrateReciterId(id: string) {
    if (id === "everyayah/warsh/warsh_yassin_al_jazaery_64kbps")
        return "quranpedia/263";
    if (/^everyayah\/Alafasy_/.test(id)) return "quranpedia/255";
    return id;
}
