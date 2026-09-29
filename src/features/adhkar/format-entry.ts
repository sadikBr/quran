/** Decode formatting escapes only; never interpret source content as HTML. */
export function formatAdhkarText(text: string) {
    return text
        .replace(/\\r\\n|\\n|\\r/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\r\n?/g, "\n");
}

const numberWords: Record<string, number> = {
    واحدة: 1,
    واحد: 1,
    ثلاث: 3,
    ثلاثة: 3,
    اربع: 4,
    اربعة: 4,
    خمس: 5,
    خمسة: 5,
    ست: 6,
    ستة: 6,
    سبع: 7,
    سبعة: 7,
    ثمان: 8,
    ثماني: 8,
    ثمانية: 8,
    تسع: 9,
    تسعة: 9,
    عشر: 10,
    عشرة: 10,
    عشرين: 20,
    عشرون: 20,
    ثلاثين: 30,
    ثلاثون: 30,
    مائة: 100,
    مئة: 100,
};

function parseCount(instruction: string): number | null {
    const phrase = instruction
        .trim()
        .replace(/[.،؛:]+$/u, "")
        .trim();
    if (phrase === "مرتين" || phrase === "مرتان") return 2;
    if (/^مرة(?: واحدة)?$/u.test(phrase)) return 1;
    const match = phrase.match(/^(.+?)\s+مر(?:ة|ات)$/u);
    if (!match) return null;
    const number = match[1].replace(
        /^(ثلاث|اربع|خمس|ست|سبع|ثمان|تسع|عشر)ا(?=\s|$)/u,
        "$1",
    );
    if (/^[0-9]+$/.test(number)) {
        const count = Number(number);
        return Number.isSafeInteger(count) && count > 0 ? count : null;
    }
    if (numberWords[number]) return numberWords[number];
    const compound = number.match(
        /^(ثلاث|ثلاثة|اربع|اربعة)\s+و\s*(ثلاثين|ثلاثون)$/u,
    );
    return compound ? numberWords[compound[1]] + 30 : null;
}

export function repetitionReference(
    text: string,
    value: unknown,
): number | null {
    // Parse a normalized copy only; never alter the displayed religious text.
    const normalized = formatAdhkarText(text)
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/[٠-٩۰-۹]/g, (digit) =>
            String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
        );
    const instructions = [
        ...normalized.matchAll(/[（(]([^()（）]*)[)）]/gu),
    ].map((match) => match[1]);
    const counts = instructions
        .map(parseCount)
        .filter((count) => count !== null);
    // Only standalone parenthetical instructions are unambiguous enough to
    // override metadata. Prose may describe rewards, alternatives, or sub-parts.
    const remaining = normalized.replace(
        /[（(]([^()（）]*)[)）]/gu,
        (whole, inner: string) => (parseCount(inner) !== null ? "" : whole),
    );
    if (/(?:^|\s|[([،؛])مر(?:ة|ات|تين|تان)(?=$|\s|[)\]،؛.])/u.test(remaining))
        return null;
    if (counts.length > 1) return null;
    if (counts.length === 1) return counts[0];
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}
