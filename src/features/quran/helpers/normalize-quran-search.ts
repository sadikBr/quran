const IGNORED_QURAN_MARK =
    /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u08d4-\u08ff]/u;
const PUNCTUATION_OR_SYMBOL = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/u;
const ALEF_VARIANT = /[أإآٱٲ]/u;
const YEH_VARIANT = /[ىئېێۍیےۓ]/u;
const WAW_VARIANT = /[ؤۇۈۉۋ]/u;
const KAF_VARIANT = /[کڪ]/u;
const HEH_VARIANT = /[ہھۀە]/u;

export function stripQuranMarkup(text: string) {
    return text.replace(/\uFEFF/g, "");
}

function normalizeUnit(character: string) {
    if (
        character === "\u0640" ||
        character === "\uFEFF" ||
        IGNORED_QURAN_MARK.test(character)
    ) {
        return "";
    }

    if (ALEF_VARIANT.test(character)) return "ا";
    if (YEH_VARIANT.test(character)) return "ي";
    if (WAW_VARIANT.test(character)) return "و";
    if (KAF_VARIANT.test(character)) return "ك";
    if (HEH_VARIANT.test(character)) return "ه";
    if (WHITESPACE.test(character) || PUNCTUATION_OR_SYMBOL.test(character)) {
        return " ";
    }

    return character.toLocaleLowerCase("en");
}

function normalizeCharacter(character: string) {
    return [...character.normalize("NFKD")].map(normalizeUnit).join("");
}

function removeQuranicInitialHamza(
    characters: string[],
    originalIndexes: number[],
) {
    for (let index = characters.length - 2; index >= 0; index -= 1) {
        if (characters[index] === "ء" && characters[index + 1] === "ا") {
            characters.splice(index, 1);
            originalIndexes.splice(index, 1);
        }
    }
}

export interface NormalizedSearchText {
    value: string;
    originalIndexes: number[];
}

export function normalizeSearchTextWithMap(text: string): NormalizedSearchText {
    const plainText = stripQuranMarkup(text);
    const characters: string[] = [];
    const originalIndexes: number[] = [];

    for (let index = 0; index < plainText.length; ) {
        const codePoint = plainText.codePointAt(index);
        if (codePoint === undefined) break;

        const character = String.fromCodePoint(codePoint);
        const normalized = normalizeCharacter(character);

        for (const normalizedCharacter of normalized) {
            if (
                normalizedCharacter === " " &&
                characters[characters.length - 1] === " "
            ) {
                continue;
            }

            characters.push(normalizedCharacter);
            originalIndexes.push(index);
        }

        index += character.length;
    }

    while (characters[0] === " ") {
        characters.shift();
        originalIndexes.shift();
    }
    while (characters[characters.length - 1] === " ") {
        characters.pop();
        originalIndexes.pop();
    }

    // Warsh text may spell an initial alif with a separate hamza (ءَامنوا),
    // while readers commonly type the modern spelling (آمنوا).
    removeQuranicInitialHamza(characters, originalIndexes);

    return { value: characters.join(""), originalIndexes };
}

export function normalizeSearchText(text: string) {
    return normalizeSearchTextWithMap(text).value;
}

export function createSearchSnippet(
    text: string,
    normalizedText: NormalizedSearchText,
    normalizedQuery: string,
    contextLength = 72,
) {
    const normalizedMatchStart = normalizedText.value.indexOf(normalizedQuery);

    if (normalizedMatchStart < 0) {
        return {
            before: stripQuranMarkup(text)
                .slice(0, contextLength * 2)
                .trim(),
            match: "",
            after: "",
            leadingEllipsis: false,
            trailingEllipsis: text.length > contextLength * 2,
        };
    }

    const plainText = stripQuranMarkup(text);
    const matchStart =
        normalizedText.originalIndexes[normalizedMatchStart] ?? 0;
    const lastNormalizedIndex =
        normalizedMatchStart + normalizedQuery.length - 1;
    const lastOriginalIndex =
        normalizedText.originalIndexes[lastNormalizedIndex] ?? matchStart;
    const matchedCharacter = String.fromCodePoint(
        plainText.codePointAt(lastOriginalIndex) ?? 0,
    );
    const matchEnd = lastOriginalIndex + matchedCharacter.length;
    const snippetStart = Math.max(0, matchStart - contextLength);
    const snippetEnd = Math.min(plainText.length, matchEnd + contextLength);

    return {
        before: plainText.slice(snippetStart, matchStart).trimStart(),
        match: plainText.slice(matchStart, matchEnd),
        after: plainText.slice(matchEnd, snippetEnd).trimEnd(),
        leadingEllipsis: snippetStart > 0,
        trailingEllipsis: snippetEnd < plainText.length,
    };
}
