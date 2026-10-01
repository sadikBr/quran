import {
    SIMILAR_GROUPS,
    type SimilarGroup,
    type StudyBook,
    type StudyNote,
    type StudyPassage,
    type StudySection,
} from "../study-types";
import { quranpediaPlainText } from "./quranpedia-data";

const ORIGIN = "https://api.quranpedia.net";

/** Parse only known fields from the official fragment; never render its HTML. */
export function validateStudyFragment(
    html: string,
    surah: number,
    ayah: number,
    section: StudySection,
) {
    const clean = html
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "");
    const root = clean.match(/<div\b[^>]*\bid="embed-fragment"[^>]*>/)?.[0];
    if (
        !root ||
        root.match(/\bdata-surah-id="(\d+)"/)?.[1] !== String(surah) ||
        root.match(/\bdata-ayah-number="(\d+)"/)?.[1] !== String(ayah) ||
        root.match(/\bdata-type="([a-z0-9]+)"/)?.[1] !== section ||
        !clean.includes("data-embed-section")
    ) {
        throw new Error("Unexpected Quranpedia study content.");
    }
    return clean;
}

// Read a balanced div from the known fragment layout, including nested content.
// Only its plain text is returned to the client; upstream markup is never rendered.
function divContent(html: string, className: string) {
    const openings = /<div\b(?:"[^"]*"|'[^']*'|[^'">])*>/g;
    for (const opening of html.matchAll(openings)) {
        const classes = opening[0].match(/\bclass="([^"]*)"/)?.[1].split(/\s+/);
        if (!classes?.includes(className)) continue;
        const start = opening.index + opening[0].length;
        let depth = 1;
        const tags = /<\/?div\b(?:"[^"]*"|'[^']*'|[^'">])*>/g;
        tags.lastIndex = start;
        for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
            depth += tag[0].startsWith("</") ? -1 : 1;
            if (depth === 0) return html.slice(start, tag.index);
        }
        throw new Error("Incomplete Quranpedia study article.");
    }
    return undefined;
}

export function parseStudyNotes(
    html: string,
    surah: number,
    ayah: number,
): StudyNote[] {
    const clean = validateStudyFragment(html, surah, ayah, "notes");
    const articles = [
        ...clean.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g),
    ];
    if (!articles.length)
        throw new Error("Quranpedia reflections are unavailable.");
    return articles.map((article) => {
        const body = divContent(article[1], "prose");
        if (body === undefined)
            throw new Error("Unexpected reflection format.");
        const header = divContent(article[1], "pb-0");
        const footer = divContent(article[1], "border-t");
        const text = quranpediaPlainText(body);
        const hasAttachments = /data-embed-youtube=|<(?:audio|video)\b/.test(
            article[1],
        );
        if (!text && !hasAttachments)
            throw new Error("Empty reflection content.");
        return {
            text,
            category: header
                ? quranpediaPlainText(header).replace(/\s+/g, " ").trim()
                : undefined,
            attribution: footer
                ? quranpediaPlainText(footer).replace(/\s+/g, " ").trim()
                : undefined,
            references: [ayah],
            hasAttachments,
        };
    });
}

function anchors(html: string) {
    return [
        ...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ].flatMap((match) => {
        try {
            const url = new URL(quranpediaPlainText(match[1]), ORIGIN);
            if (
                url.origin !== ORIGIN &&
                url.origin !== "https://quranpedia.net"
            )
                return [];
            return [{ url, html: match[2] }];
        } catch {
            return [];
        }
    });
}

export function parseStudyBooks(
    html: string,
    surah: number,
    ayah: number,
    section: StudySection,
): StudyBook[] {
    const clean = validateStudyFragment(html, surah, ayah, section);
    const books = new Map<number, StudyBook>();
    for (const link of anchors(clean)) {
        if (
            link.url.pathname !== "/embed" ||
            link.url.searchParams.get("type") !== section ||
            link.url.searchParams.get("surah") !== String(surah) ||
            link.url.searchParams.get("ayah") !== String(ayah)
        )
            continue;
        const id = Number(link.url.searchParams.get("book"));
        const label = link.html.match(
            /<(?:div|span)\b[^>]*class="[^"]*\bfont-medium\b[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/,
        )?.[1];
        const name = label
            ? quranpediaPlainText(label).replace(/\s+/g, " ").trim()
            : "";
        const authorLabel =
            link.html.match(
                /<span\b[^>]*class="[^"]*\binline-flex\b[^"]*"[^>]*>([\s\S]*?)<\/span>/,
            )?.[1] ??
            link.html.match(
                /<div\b[^>]*class="[^"]*\btext-xs\b[^"]*"[^>]*>([\s\S]*?)<\/div>/,
            )?.[1];
        const author = authorLabel
            ? quranpediaPlainText(authorLabel)
                  .replace(/\s+/g, " ")
                  .replace(/\s*\|\s*\d+\s*$/, "")
                  .trim()
            : undefined;
        if (Number.isSafeInteger(id) && id > 0 && name)
            books.set(id, { id, name, author });
    }
    // A single source is rendered directly, without a book chooser. Its footer
    // identifies the source using a title, optional author, and exact book link.
    if (!books.size) {
        for (const footer of clean.matchAll(
            /<h3\b[^>]*>([\s\S]*?)<\/h3>\s*(?:<p\b[^>]*>([\s\S]*?)<\/p>\s*)?<\/div>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/g,
        )) {
            const link = anchors(footer[3])[0];
            const id = Number(
                link?.url.pathname.match(/^\/book\/([1-9]\d*)$/)?.[1],
            );
            const name = quranpediaPlainText(footer[1])
                .replace(/\s+/g, " ")
                .trim();
            const author = footer[2]
                ? quranpediaPlainText(footer[2]).replace(/\s+/g, " ").trim()
                : undefined;
            if (Number.isSafeInteger(id) && id > 0 && name)
                books.set(id, { id, name, author });
        }
    }
    if (!books.size)
        throw new Error("Quranpedia study catalogue is unavailable.");
    return [...books.values()];
}

export function parseStudyMeanings(
    html: string,
    surah: number,
    ayah: number,
    book: number,
) {
    const clean = validateStudyFragment(html, surah, ayah, "meanings");
    // The footer identifies the book whose definitions were actually returned.
    if (!anchors(clean).some(({ url }) => url.pathname === `/book/${book}`))
        throw new Error("Unexpected Quranpedia meanings book.");
    const body = clean.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
    if (!body) throw new Error("Quranpedia word meanings are unavailable.");
    return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => {
        const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(
            (cell) => quranpediaPlainText(cell[1]).replace(/\s+/g, " ").trim(),
        );
        if (cells.length !== 2 || !cells[0] || !cells[1])
            throw new Error("Unexpected word meanings format.");
        return { word: cells[0], meaning: cells[1], references: [ayah] };
    });
}

export function parseSimilarReferences(
    html: string,
    surah: number,
    ayah: number,
) {
    const clean = validateStudyFragment(html, surah, ayah, "similar");
    const groups = new Map<SimilarGroup, { surah: number; ayah: number }[]>();
    for (const panel of clean.matchAll(
        /<section\b[^>]*data-embed-tab-panel="([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g,
    )) {
        if (!SIMILAR_GROUPS.includes(panel[1] as SimilarGroup)) continue;
        const refs = new Map<string, { surah: number; ayah: number }>();
        for (const { url } of anchors(panel[2])) {
            const chapter = Number(
                url.pathname.match(/^\/surah\/1\/(\d+)$/)?.[1],
            );
            const verse = Number(url.hash.match(/^#(\d+)$/)?.[1]);
            if (chapter >= 1 && chapter <= 114 && verse >= 1 && verse <= 286)
                refs.set(`${chapter}:${verse}`, {
                    surah: chapter,
                    ayah: verse,
                });
        }
        if (refs.size) groups.set(panel[1] as SimilarGroup, [...refs.values()]);
    }
    if (!groups.size)
        throw new Error("Quranpedia similar verses are unavailable.");
    return [...groups].map(([type, references]) => ({ type, references }));
}

/** Repeated passages often span multiple mapped verses. Keep their provenance. */
export function mergeStudyPassages(passages: StudyPassage[]) {
    const merged = new Map<string, StudyPassage>();
    for (const passage of passages) {
        if (!passage.text) continue;
        const existing = merged.get(passage.text);
        if (existing)
            existing.references = [
                ...new Set([...existing.references, ...passage.references]),
            ];
        else
            merged.set(passage.text, {
                ...passage,
                references: [...passage.references],
            });
    }
    return [...merged.values()];
}
