import type { TajweedSegment } from "../helpers/quranpedia-tajweed";
import TajweedText from "./tajweed-text";

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
    return (
        <TajweedText>
            {segments.map((segment) => {
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
                    // biome-ignore lint/a11y/useSemanticElements: Inline spans preserve Arabic joining across rule boundaries; keyboard interaction is delegated to TajweedText.
                    <span
                        key={key}
                        data-tajweed={segment.rule}
                        data-tajweed-rules={(
                            segment.rules ?? [segment.rule]
                        ).join(" ")}
                        role="button"
                        tabIndex={0}
                        className="cursor-help rounded-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-current"
                    >
                        {content}
                    </span>
                ) : (
                    content
                );
            })}
        </TajweedText>
    );
}
