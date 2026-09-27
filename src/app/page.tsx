import {
    ArrowRight,
    BookOpen,
    BookText,
    Headphones,
    Languages,
    Search,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";
import getDailyWird from "@/features/wird/server/get-daily-wird";
import { getMessages, getTextDirection } from "@/i18n/config";
import QuranInfo from "@/lib/quran-info";
import { cn } from "@/lib/utils";

const readerTools = [
    {
        icon: BookOpen,
        key: "place",
    },
    {
        icon: Headphones,
        key: "recitation",
    },
    {
        icon: Languages,
        key: "meaning",
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
    const dailyWird = session
        ? await getDailyWird(session.user.id, preferences.arabicEdition).catch(
              () => null,
          )
        : null;
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
    const hasPendingWird = Boolean(
        dailyWird && !dailyWird.completed && !dailyWird.scheduledForFuture,
    );
    const href = hasPendingWird ? "/wird" : readingHref;
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

    if (hasPendingWird) {
        continueReadingLabel = t(
            dailyWird?.progressGlobalAyah
                ? "hero.continueWird"
                : "hero.startWird",
        );
    }

    const accountLabels = {
        openMenu: t("account.openMenu"),
        readingSpace: t("account.readingSpace"),
        switchToLight: t("account.switchToLight"),
        switchToDark: t("account.switchToDark"),
        continueReading: hasPendingWird
            ? continueReadingLabel
            : t("account.continueReading"),
        dashboard: t("account.dashboard"),
        profile: t("account.profile"),
        settings: t("account.settings"),
        signOut: t("account.signOut"),
    };

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
            <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
                <StickyAppHeader className="-mx-4 px-4 text-foreground transition-colors data-[scrolled=true]:text-foreground sm:-mx-6 sm:px-6 dark:text-white">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <span className="hidden text-sm font-semibold tracking-wide sm:inline">
                            {t("brand")}
                        </span>
                    </Link>

                    {session ? (
                        <UserMenu
                            name={session.user.name}
                            image={session.user.image}
                            continueReadingHref={href}
                            labels={accountLabels}
                        />
                    ) : (
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Button asChild size="sm" variant="ghost">
                                <Link href="/sign-in">
                                    {t("header.signIn")}
                                </Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/sign-up">
                                    {t("header.createAccount")}
                                </Link>
                            </Button>
                        </div>
                    )}
                </StickyAppHeader>

                <section className="relative min-h-[35rem] w-dvw max-w-none self-center text-foreground sm:min-h-[39rem] lg:min-h-[42rem] dark:text-white">
                    <div
                        aria-hidden="true"
                        className="absolute inset-x-0 -top-20 bottom-0 overflow-hidden"
                    >
                        <span className="absolute inset-0 bg-[url('/meccan-home-light-v1.webp')] bg-cover bg-position-[center_60%] sm:bg-bottom dark:hidden" />
                        <span
                            className={cn(
                                "absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,246,0.9)_0%,rgba(255,252,246,0.62)_48%,rgba(255,252,246,0.12)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(255,252,246,0.22)_0%,rgba(255,252,246,0.6)_44%,rgba(255,252,246,0.94)_100%)] dark:hidden",
                                preferences.language === "ar" &&
                                    "max-lg:scale-x-100 lg:-scale-x-100",
                            )}
                        />
                        <span className="absolute inset-0 hidden bg-[url('/meccan-surah-background-v2.webp')] bg-cover bg-position-[center_60%] sm:bg-bottom dark:block" />
                        <span
                            className={cn(
                                "absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(12,11,10,0.94)_0%,rgba(12,11,10,0.7)_48%,rgba(12,11,10,0.18)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(12,11,10,0.38)_0%,rgba(12,11,10,0.68)_42%,rgba(12,11,10,0.96)_100%)] dark:block",
                                preferences.language === "ar" &&
                                    "max-lg:scale-x-100 lg:-scale-x-100",
                            )}
                        />
                        <span className="absolute inset-0 hidden bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,0.08),transparent_32%)] dark:block" />
                    </div>
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-28 bg-linear-to-t from-background via-background/70 to-transparent sm:h-40"
                    />

                    <div className="relative z-10 mx-auto flex min-h-[35rem] w-full max-w-6xl flex-col justify-between px-4 py-6 sm:min-h-[39rem] sm:px-6 sm:py-10 lg:min-h-[42rem] lg:py-14">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between sm:gap-6">
                            <p className="max-w-48 text-[0.65rem] font-semibold tracking-[0.2em] text-foreground/65 uppercase sm:max-w-none dark:text-white/65">
                                {t("hero.intro")}
                            </p>
                            <p
                                dir="rtl"
                                lang="ar"
                                className="ayah max-w-xs self-end text-right text-2xl leading-[1.7] text-foreground/85 sm:self-auto sm:text-3xl lg:text-4xl dark:text-white/90"
                            >
                                وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
                            </p>
                        </div>

                        <div className="me-auto max-w-2xl pt-16">
                            <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                <span className="h-px w-8 bg-primary" />
                                {t("hero.eyebrow")}
                            </p>
                            <h1 className="text-4xl font-semibold leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                                {t("hero.title")}
                            </h1>
                            <p className="mt-6 max-w-xl text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8 dark:text-white/70">
                                {t("hero.description")}
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-12 rounded-full px-7 shadow-lg shadow-black/20"
                                >
                                    <Link href={href}>
                                        {continueReadingLabel}
                                        <ArrowRight
                                            aria-hidden="true"
                                            className={cn(
                                                preferences.language === "ar" &&
                                                    "rotate-180",
                                            )}
                                        />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-12 rounded-full border border-foreground/15 bg-background/20 px-7 text-foreground hover:bg-background/40 hover:text-foreground dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/14 dark:hover:text-white"
                                >
                                    <Link href="/quran">
                                        {t("hero.explore")}
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-12 rounded-full px-5 text-foreground/75 hover:bg-background/35 hover:text-foreground dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <Link href="/quran/search">
                                        <Search
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        {t("hero.search")}
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="mt-12 mb-12 flex flex-wrap gap-x-10 gap-y-5 text-foreground/65 sm:mb-16 lg:mb-20 dark:text-white/70">
                            <div>
                                <p className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase">
                                    {savedNumber === null
                                        ? t("progress.startingPlace")
                                        : t("progress.continueFrom")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground dark:text-white">
                                    {readingPlace}
                                </p>
                            </div>
                            <div>
                                <p className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase">
                                    {t("progress.readingMode")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground capitalize dark:text-white">
                                    {t(
                                        preferences.readingMode === "page"
                                            ? "progress.modePage"
                                            : "progress.modeSurah",
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-[0.62rem] font-semibold tracking-[0.16em] uppercase">
                                    {t("progress.completeText")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground dark:text-white">
                                    {t("progress.textSummary", {
                                        surahs: QuranInfo.maxSurahNumber,
                                        pages: QuranInfo.maxPageNumber,
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    aria-labelledby="reader-tools"
                    className="py-20 sm:py-28"
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

                        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10 lg:gap-14">
                            {readerTools.map(({ icon: Icon, key }) => (
                                <article key={key} className="text-start">
                                    <span className="text-primary">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-6"
                                        />
                                    </span>
                                    <div>
                                        <p className="mt-5 text-[0.65rem] font-semibold tracking-[0.16em] text-primary uppercase">
                                            {t(`tools.${key}.eyebrow`)}
                                        </p>
                                        <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight">
                                            {t(`tools.${key}.title`)}
                                        </h3>
                                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                            {t(`tools.${key}.description`)}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto mb-12 max-w-2xl py-12 text-center sm:py-16">
                    <BookText
                        aria-hidden="true"
                        className="mx-auto size-7 text-primary"
                    />
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                        {t("closing.title")}
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">
                        {t("closing.description")}
                    </p>
                    <Button asChild className="mt-7 rounded-full px-6">
                        <Link href="/quran">
                            {t("closing.browse")}
                            <ArrowRight
                                aria-hidden="true"
                                className={cn(
                                    preferences.language === "ar" &&
                                        "rotate-180",
                                )}
                            />
                        </Link>
                    </Button>
                </section>
            </div>
        </main>
    );
}
