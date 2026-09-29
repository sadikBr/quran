import { Bell, HandHeart, Moon, MoonStar, Sunrise } from "lucide-react";
import Link from "next/link";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { ADHKAR, isAdhkarCategory } from "@/features/adhkar/catalog";
import AdhkarReader from "@/features/adhkar/components/adhkar-reader";
import getAdhkar from "@/features/adhkar/server/get-adhkar";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function AdhkarPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const [{ language }, query] = await Promise.all([
        getPreferences(),
        searchParams,
    ]);
    const ar = language === "ar";
    const category =
        query.category && isAdhkarCategory(query.category)
            ? query.category
            : "morning";
    const entries = await getAdhkar(category).catch(() => null);
    return (
        <main
            lang={language}
            dir={ar ? "rtl" : "ltr"}
            className={`relative isolate min-h-dvh bg-background ${ar ? "arabic-ui" : ""}`}
        >
            <PageBackground />
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StickyAppHeader navigation>
                    <span className="text-sm font-semibold text-muted-foreground">
                        {ar ? "حصن المسلم" : "Hisn al-Muslim"}
                    </span>
                </StickyAppHeader>
                <header className="flex items-center justify-between gap-4 pb-6 pt-5 sm:pb-8 sm:pt-8">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 sm:size-14">
                            <MoonStar
                                aria-hidden="true"
                                className="size-6 text-primary"
                            />
                        </span>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {ar ? "الأذكار" : "Adhkar"}
                            </h1>
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                {ar
                                    ? "لحظات من الذكر، تصحبك في يومك."
                                    : "A quiet moment of remembrance in your day."}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/settings#adhkar-reminders"
                        aria-label={ar ? "ضبط التذكيرات" : "Set reminders"}
                        title={ar ? "ضبط التذكيرات" : "Set reminders"}
                        className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card/50 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-auto sm:rounded-xl sm:px-4"
                    >
                        <Bell className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {ar ? "ضبط التذكيرات" : "Set reminders"}
                        </span>
                    </Link>
                </header>
                <nav
                    aria-label={ar ? "أقسام الأذكار" : "Adhkar collections"}
                    className="mb-5 grid grid-cols-2 gap-2 sm:mb-7 sm:grid-cols-4 sm:gap-3"
                >
                    {Object.entries(ADHKAR).map(([key, item]) => (
                        <Link
                            key={key}
                            href={`/azkar?category=${key}`}
                            aria-current={category === key ? "page" : undefined}
                            className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-16 sm:px-4 ${category === key ? "border-primary/35 bg-primary/10 text-primary shadow-sm" : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/20 hover:bg-card hover:text-foreground"}`}
                        >
                            {key === "morning" ? (
                                <Sunrise
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ) : key === "evening" ? (
                                <MoonStar
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ) : key === "sleep" ? (
                                <Moon className="size-4" aria-hidden="true" />
                            ) : (
                                <HandHeart
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            <span className="flex-1">{item[language]}</span>
                            {category === key && (
                                <span
                                    className="size-1.5 shrink-0 rounded-full bg-primary"
                                    aria-hidden="true"
                                />
                            )}
                        </Link>
                    ))}
                </nav>
                <section
                    className="pb-12"
                    aria-label={ADHKAR[category][language]}
                >
                    <div className="space-y-4">
                        {entries ? (
                            <AdhkarReader
                                key={category}
                                entries={entries}
                                category={category}
                                ar={ar}
                            />
                        ) : (
                            <div role="alert" className="rounded-xl border p-6">
                                <p>
                                    {ar
                                        ? "تعذّر تحميل الأذكار من المصدر. حاول مرة أخرى بعد قليل."
                                        : "The adhkar source could not be loaded. Please try again shortly."}
                                </p>
                                <Link
                                    href={`/azkar?category=${category}`}
                                    className="mt-4 inline-block text-primary underline"
                                >
                                    {ar ? "إعادة المحاولة" : "Try again"}
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
