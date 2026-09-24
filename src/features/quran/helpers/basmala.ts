const DISPLAY_BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

const NORMALIZED_BASMALA = "بسماللهالرحمنالرحيم";
const ARABIC_MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\sـ]/;

function normalizeArabicCharacter(character: string) {
    if (ARABIC_MARK.test(character)) return "";
    return character.replace(/[أإآٱ]/, "ا").replace(/ى/, "ي");
}

export function getBasmalaText() {
    return DISPLAY_BASMALA;
}

export function stripBasmalaPrefix(text: string) {
    if (text.includes("[")) return text;

    let normalizedPrefix = "";

    for (let index = 0; index < text.length; index += 1) {
        normalizedPrefix += normalizeArabicCharacter(text[index]);

        if (!NORMALIZED_BASMALA.startsWith(normalizedPrefix)) {
            return text;
        }

        if (normalizedPrefix === NORMALIZED_BASMALA) {
            let prefixEnd = index + 1;

            while (
                prefixEnd < text.length &&
                ARABIC_MARK.test(text[prefixEnd])
            ) {
                prefixEnd += 1;
            }

            return text.slice(prefixEnd).trimStart();
        }
    }

    return text;
}
