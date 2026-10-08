import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Sparkles,
    UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

const readerTools = [
    {
        icon: CalendarDays,
        key: "rhythm",
        href: "/plans/today",
    },
    {
        icon: Sparkles,
        key: "practice",
        href: "/memorization",
    },
    {
        icon: UsersRound,
        key: "groups",
        href: "/groups",
    },
] as const;

export async function generateMetadata(): Promise<Metadata> {
    const { language } = await getPreferences();
    const messages = await getMessages(language);
    const t = createTranslator({
        locale: language,
        messages,
        namespace: "Home",
    });

    return {
        title: t("metadata.title"),
        description: t("metadata.description"),
    };
}

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const [preferences, readingProgress] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
    ]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const currentNumber = savedNumber ?? 1;
    const readingHref = `/quran/${preferences.readingMode}/${currentNumber}`;
    const plansT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Plans",
    });
    const href = session ? "/plans/today" : readingHref;
    let continueReadingLabel = t("hero.beginReading");
    let readingPlace =
        preferences.readingMode === "page"
            ? t("progress.page", { number: currentNumber })
            : t("progress.surah", { number: currentNumber });

    if (preferences.readingMode === "surah") {
        const surahs = await getSurahsMeta().catch(() => []);
        const surah = surahs.find((item) => item.number === currentNumber);

        if (surah) {
            readingPlace =
                preferences.language === "ar" ? surah.name : surah.englishName;
        }
    }

    if (savedNumber !== null) {
        continueReadingLabel = t("hero.continueReading");
    }

    if (session) continueReadingLabel = plansT("goToToday");

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container flex min-h-dvh flex-col">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 text-foreground transition-colors data-[scrolled=true]:text-foreground sm:-mx-6 sm:px-6 dark:text-white"
                />

                <section
                    className={cn(
                        "relative w-dvw max-w-none self-center text-foreground dark:text-white",
                        session && "flex flex-col",
                    )}
                >
                    <div
                        aria-hidden="true"
                        className="home-landscape-frame absolute inset-x-0 -top-20 h-80 overflow-hidden sm:h-96 lg:bottom-0 lg:h-auto"
                    >
                        <span className="home-landscape-light absolute inset-0 bg-[url('/meccan-home-light-v1.webp')] bg-cover bg-position-[left_60%] lg:bg-bottom dark:hidden" />
                        <span
                            className={cn(
                                "home-landscape-light-shade absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,246,0.9)_0%,rgba(255,252,246,0.62)_48%,rgba(255,252,246,0.12)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(255,252,246,0.22)_0%,rgba(255,252,246,0.6)_44%,rgba(255,252,246,0.94)_100%)] dark:hidden",
                                preferences.language === "ar" &&
                                    "max-lg:scale-x-100 lg:-scale-x-100",
                            )}
                        />
                        <span className="home-landscape absolute inset-0 hidden bg-[url('/meccan-surah-background-v2.webp')] bg-cover bg-position-[left_60%] lg:bg-bottom dark:block" />
                        <span
                            className={cn(
                                "home-landscape-shade absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(12,11,10,0.94)_0%,rgba(12,11,10,0.7)_48%,rgba(12,11,10,0.18)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(12,11,10,0.38)_0%,rgba(12,11,10,0.68)_42%,rgba(12,11,10,0.96)_100%)] dark:block",
                                preferences.language === "ar" &&
                                    "max-lg:scale-x-100 lg:-scale-x-100",
                            )}
                        />
                        <span className="absolute inset-0 hidden bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.08),transparent_32%)] dark:block" />
                        {session && (
                            <span className="home-session-shade absolute inset-0 bg-transparent lg:bg-background/35 lg:dark:bg-background/25" />
                        )}
                    </div>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-28 bg-linear-to-t from-background via-background/70 to-transparent sm:h-40"
                    />

                    <div
                        className={cn(
                            "app-container relative z-10 flex flex-col py-6 sm:py-10",
                            session && "gap-8 py-8 sm:gap-10 sm:py-12",
                        )}
                    >
                        <div
                            className={cn(
                                "flex flex-col items-start gap-4 sm:flex-row sm:justify-between sm:gap-6",
                                session && "items-center sm:justify-center",
                            )}
                        >
                            <p
                                className={cn(
                                    "max-w-48 text-[0.65rem] font-semibold tracking-[0.2em] text-foreground/65 uppercase sm:max-w-none dark:text-white/65",
                                    session && "hidden",
                                )}
                            >
                                {t("hero.intro")}
                            </p>
                            <p
                                dir="rtl"
                                lang="ar"
                                className={cn(
                                    "ayah max-w-xs self-end text-right text-2xl leading-[1.7] text-foreground/85 sm:self-auto sm:text-3xl lg:text-4xl dark:text-white/90",
                                    session &&
                                        "max-w-none self-center text-center",
                                )}
                            >
                                وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
                            </p>
                        </div>

                        <div
                            className={cn(
                                "me-auto max-w-3xl pb-12 pt-8 sm:pb-16 sm:pt-12",
                                session &&
                                    "mx-auto grid w-full max-w-none items-center gap-8 pb-0 pt-0 sm:pb-0 sm:pt-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:gap-16",
                            )}
                        >
                            <div>
                                <p
                                    className={cn(
                                        "mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase",
                                        session && "justify-start",
                                    )}
                                >
                                    <span className="h-px w-8 bg-primary" />
                                    {t("hero.eyebrow")}
                                </p>
                                <h1 className="text-4xl font-semibold leading-snug tracking-tight text-balance sm:text-5xl sm:leading-tight lg:text-6xl xl:text-7xl">
                                    {t("hero.title")}
                                </h1>
                                <p
                                    className={cn(
                                        "mt-6 max-w-xl text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8 dark:text-white/70",
                                        session && "max-w-2xl",
                                    )}
                                >
                                    {t("hero.description")}
                                </p>
                            </div>
                            <div
                                className={cn(
                                    session &&
                                        "rounded-2xl border border-border/60 bg-background/65 p-5 shadow-xl backdrop-blur-md sm:p-7",
                                )}
                            >
                                <div
                                    className={cn(
                                        "mt-7 flex items-center gap-3 text-foreground/70 dark:text-white/70",
                                        session &&
                                            "mt-0 w-full items-start text-start",
                                    )}
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/30 text-primary backdrop-blur-sm dark:bg-white/10">
                                        {session ? (
                                            <CalendarDays
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                        ) : (
                                            <BookOpen
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                        )}
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold tracking-[0.14em] uppercase">
                                            {session
                                                ? plansT("title")
                                                : savedNumber === null
                                                  ? t("progress.startingPlace")
                                                  : t("progress.continueFrom")}
                                        </p>
                                        <p className="mt-2 text-base font-semibold leading-7 text-foreground dark:text-white">
                                            {session
                                                ? plansT("today")
                                                : readingPlace}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        "mt-6 grid gap-2 sm:flex sm:flex-wrap sm:gap-3",
                                        session && "mt-6 w-full sm:block",
                                    )}
                                >
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="default"
                                        className={cn(
                                            "h-12 w-full rounded-xl px-7 shadow-lg shadow-black/20 sm:w-auto",
                                            session && "sm:w-full",
                                        )}
                                    >
                                        <Link href={href}>
                                            {continueReadingLabel}
                                            <ArrowRight
                                                aria-hidden="true"
                                                className={cn(
                                                    preferences.language ===
                                                        "ar" && "rotate-180",
                                                )}
                                            />
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="lg"
                                        className={cn(
                                            "h-12 rounded-xl bg-background/60 px-5",
                                            session && "mt-2 w-full",
                                        )}
                                    >
                                        <Link href={"/quran"}>
                                            {t("hero.browseQuran")}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    aria-labelledby="reader-tools"
                    className="py-10 sm:py-16"
                >
                    <div>
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                                {t("tools.eyebrow")}
                            </p>
                            <h2
                                id="reader-tools"
                                className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl"
                            >
                                {t("tools.title")}
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl leading-7 text-muted-foreground">
                                {t("tools.description")}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {readerTools.map(
                                ({ icon: Icon, key, href: toolHref }) => {
                                    const cardClassName =
                                        "app-card flex h-full flex-col p-4 text-start sm:p-5";
                                    const content = (
                                        <>
                                            <span className="flex size-10 shrink-0 items-center justify-center self-start rounded-xl bg-primary/10 text-primary">
                                                <Icon
                                                    aria-hidden="true"
                                                    className="size-5"
                                                />
                                            </span>
                                            <div>
                                                <h3 className="mt-4 text-lg font-semibold leading-6">
                                                    {t(`tools.${key}.title`)}
                                                </h3>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    {t(
                                                        `tools.${key}.description`,
                                                    )}
                                                </p>
                                            </div>
                                            {session && (
                                                <span className="mt-auto inline-flex items-center gap-2 self-start pt-5 text-sm font-semibold text-primary">
                                                    {t(`tools.${key}.action`)}
                                                    <ArrowRight
                                                        aria-hidden="true"
                                                        className="size-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 rtl:rotate-180"
                                                    />
                                                </span>
                                            )}
                                        </>
                                    );

                                    return session ? (
                                        <Link
                                            key={key}
                                            href={toolHref}
                                            className={cn(
                                                cardClassName,
                                                "group transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            )}
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        <article
                                            key={key}
                                            className={cardClassName}
                                        >
                                            {content}
                                        </article>
                                    );
                                },
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
