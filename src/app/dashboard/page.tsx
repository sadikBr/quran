import {
    ArrowRight,
    BookOpen,
    ChartNoAxesCombined,
    Target,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import SavedAyahsSection from "@/features/saved-ayahs/components/saved-ayahs-section";
import getSavedAyahs from "@/features/saved-ayahs/server/get-saved-ayahs";
import getPreferences from "@/features/settings/server/get-preferences";

const upcomingFeatures = [
    {
        icon: Target,
        title: "Memorization goals",
        description:
            "Set a daily goal and build a sustainable memorization routine.",
    },
    {
        icon: ChartNoAxesCombined,
        title: "Progress insights",
        description: "See your reading and memorization progress at a glance.",
    },
];

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const [preferences, readingProgress, savedAyahs] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
        getSavedAyahs(session.user.id),
    ]);
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const currentNumber = savedNumber ?? 1;
    const readingLabel = preferences.readingMode === "page" ? "page" : "surah";
    const continueReadingHref = `/quran/${preferences.readingMode}/${currentNumber}`;
    let readingHeading = `Begin with ${readingLabel} ${currentNumber}.`;

    if (savedNumber !== null) {
        readingHeading = `Continue from ${readingLabel} ${currentNumber}.`;

        if (preferences.readingMode === "surah") {
            const surahs = await getSurahsMeta().catch(() => []);
            const surahName = surahs.find(
                (surah) => surah.number === savedNumber,
            )?.englishName;

            readingHeading = surahName
                ? `Continue with ${surahName}.`
                : "Continue reading.";
        }
    }

    return (
        <main className="relative isolate min-h-dvh overflow-x-clip bg-background">
            <PageBackground />
            <div className="mx-auto max-w-5xl px-4">
                <StickyAppHeader className="-mx-4 px-4">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            Quran Reader
                        </span>
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                    />
                </StickyAppHeader>

                <section className="py-10 sm:py-14">
                    <div>
                        <p className="text-sm font-semibold tracking-[0.18em] text-primary">
                            YOUR DASHBOARD
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Welcome back, {session.user.name}.
                        </h1>
                        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                            Return to the Quran at your own pace. Your reading
                            space is ready whenever you are.
                        </p>
                    </div>

                    <section className="mt-10 bg-muted/45 px-5 py-6 sm:px-7 sm:py-7">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                            <div className="flex gap-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <BookOpen
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <div>
                                    <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                        Your reading place
                                    </p>
                                    <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">
                                        {readingHeading}
                                    </h2>
                                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                        {savedNumber
                                            ? "Pick up exactly where you left off in your preferred reading mode."
                                            : "Start your reading journey in your preferred reading mode."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-3">
                                <Button asChild>
                                    <Link href={continueReadingHref}>
                                        {savedNumber
                                            ? "Continue reading"
                                            : "Start reading"}
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href="/quran">Browse surahs</Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    <QuranAudioProvider>
                        <SavedAyahsSection
                            savedAyahs={savedAyahs}
                            readingMode={preferences.readingMode}
                        />
                    </QuranAudioProvider>

                    <section className="mt-16" aria-labelledby="coming-soon">
                        <div className="max-w-xl">
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                On the horizon
                            </p>
                            <h2
                                id="coming-soon"
                                className="mt-2 text-xl font-semibold tracking-tight"
                            >
                                Your practice will grow with you.
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                These tools are being prepared for your personal
                                reading journey.
                            </p>
                        </div>
                        <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
                            {upcomingFeatures.map(
                                ({ icon: Icon, title, description }) => (
                                    <article key={title} className="flex gap-4">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                            <Icon
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <div>
                                            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-primary uppercase">
                                                In development
                                            </p>
                                            <h3 className="mt-1 font-semibold">
                                                {title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}
