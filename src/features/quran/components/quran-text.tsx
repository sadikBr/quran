import {
    TAJWEED_RULES,
    type TajweedSegment,
} from "../helpers/quranpedia-tajweed";

export function getPlainQuranText(text: string) {
    return text.replace(/\uFEFF/g, "");
}

export default function QuranText({
    text,
    tajweed,
}: {
    text: string;
    tajweed?: TajweedSegment[];
}) {
    if (!tajweed) return getPlainQuranText(text);
    const clean = (value: string) => value.replace(/[\uFEFF۞ـ]/gu, "");
    const segments = tajweed.map((s) => ({ ...s, text: clean(s.text) }));
    const target = clean(text).trim();
    const full = segments.map((s) => s.text).join("");
    const start = full.indexOf(target);
    if (start < 0) return getPlainQuranText(text);
    let offset = 0;
    return segments.map((segment) => {
        const from = Math.max(0, start - offset);
        const to = Math.min(
            segment.text.length,
            start + target.length - offset,
        );
        const key = offset;
        offset += segment.text.length;
        if (to <= from) return null;
        const content = segment.text.slice(from, to);
        return segment.rule ? (
            <span
                key={key}
                data-tajweed={segment.rule}
                title={TAJWEED_RULES[segment.rule].join(" · ")}
            >
                {content}
            </span>
        ) : (
            content
        );
    });
}
