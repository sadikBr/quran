/** Presentation only: retain the complete wording in the bundled source. */
export function readingParagraphs(text: string): string[] {
    return text
        .split(/\n\s*\n/u)
        .map((paragraph) =>
            paragraph.trim().replace(/^بسم الله الرحمن الرحيم\s*(?=﴿)/u, ""),
        )
        .filter(Boolean);
}
