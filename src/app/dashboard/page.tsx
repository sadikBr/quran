import {
    ArrowRight,
    BookOpen,
    ChartNoAxesCombined,
    Target,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
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

    const [preferences, readingProgress] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
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
        <main className="min-h-dvh bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between gap-4 border-b pb-5">
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
                    />
                </header>

                <section className="py-10 sm:py-14">
                    <p className="text-sm font-semibold tracking-[0.18em] text-primary">
                        YOUR DASHBOARD
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Welcome back, {session.user.name}.
                    </h1>
                    <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                        Your reading space is ready whenever you are. Progress
                        and memorization tools will appear here as they are
                        added.
                    </p>

                    <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8">
                        <div>
                            <p className="text-sm font-semibold text-primary">
                                CONTINUE YOUR READING
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold">
                                {readingHeading}
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                {savedNumber
                                    ? "Pick up exactly where you left off in your preferred reading mode."
                                    : "Start your reading journey in your preferred reading mode."}
                            </p>
                        </div>
                        <div className="mt-5 flex shrink-0 flex-wrap gap-3 sm:mt-0">
                            <Button asChild>
                                <Link href={continueReadingHref}>
                                    {savedNumber
                                        ? "Continue reading"
                                        : "Start reading"}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/quran">Browse surahs</Link>
                            </Button>
                        </div>
                    </div>

                    <section className="mt-10" aria-labelledby="coming-soon">
                        <h2 id="coming-soon" className="text-lg font-semibold">
                            Coming next
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Features planned for your personal dashboard.
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {upcomingFeatures.map(
                                ({ icon: Icon, title, description }) => (
                                    <article
                                        key={title}
                                        className="rounded-xl border border-dashed bg-card/60 p-5"
                                    >
                                        <span className="mb-4 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                                            <Icon
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <h3 className="font-semibold">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {description}
                                        </p>
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
