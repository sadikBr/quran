"use client";

import { HandHeart, Moon, MoonStar, Sunrise } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { AdhkarCategory } from "../catalog";
import { ADHKAR, isAdhkarCategory } from "../catalog";
import type { AdhkarEntry } from "../types";
import AdhkarReader from "./adhkar-reader";

export default function AdhkarCollections({
    collections,
    ar,
}: {
    collections: Record<AdhkarCategory, AdhkarEntry[]>;
    ar: boolean;
}) {
    const searchParams = useSearchParams();
    const requested = searchParams.get("category");
    const category =
        requested && isAdhkarCategory(requested) ? requested : "morning";
    return (
        <>
            <nav
                aria-label={ar ? "أقسام الأذكار" : "Adhkar collections"}
                className="mb-5 grid grid-cols-2 gap-2 sm:mb-7 sm:grid-cols-4 sm:gap-3"
            >
                {Object.entries(ADHKAR).map(([key, item]) => (
                    <a
                        key={key}
                        href={`/azkar?category=${key}`}
                        onClick={(event) => {
                            if (
                                event.button !== 0 ||
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey
                            )
                                return;
                            event.preventDefault();
                            if (category === key) return;
                            const url = new URL(window.location.href);
                            url.searchParams.set("category", key);
                            window.history.pushState(null, "", url);
                        }}
                        aria-current={category === key ? "page" : undefined}
                        className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-16 sm:px-4 ${category === key ? "border-primary/35 bg-primary/10 text-primary shadow-sm" : "border-border/60 bg-card text-muted-foreground hover:border-primary/20 hover:bg-card hover:text-foreground"}`}
                    >
                        {key === "morning" ? (
                            <Sunrise className="size-4" aria-hidden="true" />
                        ) : key === "evening" ? (
                            <MoonStar className="size-4" aria-hidden="true" />
                        ) : key === "sleep" ? (
                            <Moon className="size-4" aria-hidden="true" />
                        ) : (
                            <HandHeart className="size-4" aria-hidden="true" />
                        )}
                        <span className="flex-1">{item[ar ? "ar" : "en"]}</span>
                        {category === key && (
                            <span
                                className="size-1.5 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                            />
                        )}
                    </a>
                ))}
            </nav>

            <section
                className="pb-12"
                aria-label={ADHKAR[category][ar ? "ar" : "en"]}
            >
                <AdhkarReader
                    key={category}
                    entries={collections[category]}
                    category={category}
                    ar={ar}
                />
            </section>
        </>
    );
}
