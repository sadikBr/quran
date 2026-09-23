import { ArrowRight, BookOpen, ChartNoAxesCombined, Heart } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";

const features = [
    {
        icon: BookOpen,
        title: "Read with ease",
        description:
            "Browse by surah or page in a focused reading experience designed for every screen.",
    },
    {
        icon: Heart,
        title: "Build a habit",
        description:
            "Return to a calm, dedicated space for your daily Quran reading.",
    },
    {
        icon: ChartNoAxesCombined,
        title: "Track your progress",
        description:
            "Keep your reading journey close at hand in your personal dashboard.",
    },
];

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const [preferences, readingProgress] = await Promise.all([
        getPreferences(),
        getReadingProgress(),
    ]);
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const href = `/quran/${preferences.readingMode}/${savedNumber ?? 1}`;
    let continueReadingLabel = "Start reading";

    if (savedNumber !== null) {
        continueReadingLabel = `Continue from page ${savedNumber}`;

        if (preferences.readingMode === "surah") {
            const surahs = await getSurahsMeta().catch(() => []);
            const surahName = surahs.find(
                (surah) => surah.number === savedNumber,
            )?.englishName;

            continueReadingLabel = surahName
                ? `Continue with ${surahName}`
                : "Continue reading";
        }
    }

    return (
        <main className="min-h-dvh overflow-hidden bg-background bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,oklch(0.9_0.05_74.9889/0.42),transparent_70%)]">
            <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
                <header className="flex h-20 items-center justify-between gap-4">
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

                    {session ? (
                        <UserMenu
                            name={session.user.name}
                            image={session.user.image}
                        />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="ghost">
                                <Link href="/sign-in">Sign in</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/sign-up">Create account</Link>
                            </Button>
                        </div>
                    )}
                </header>

                <section className="flex flex-1 flex-col py-16 sm:py-24">
                    <div className="max-w-3xl">
                        <p className="mb-5 text-sm font-semibold tracking-[0.18em] text-primary">
                            READ · REFLECT · REMEMBER
                        </p>
                        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
                            A quiet place to spend time with the Quran.
                        </h1>
                        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Read the Quran at your own pace, find any surah with
                            ease, and build a meaningful daily practice.
                        </p>
                        {session ? (
                            <div className="mt-8">
                                <Button asChild size="lg">
                                    <Link href="/dashboard">
                                        My dashboard
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                    <Link
                                        href={href}
                                        className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {continueReadingLabel}
                                    </Link>
                                    <span
                                        aria-hidden="true"
                                        className="text-border"
                                    >
                                        ·
                                    </span>
                                    <Link
                                        href="/quran"
                                        className="transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Browse surahs
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button asChild size="lg">
                                    <Link href={href}>
                                        Start reading
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <Link href="/quran">Browse surahs</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-16 grid gap-4 md:grid-cols-3">
                        {features.map(({ icon: Icon, title, description }) => (
                            <article
                                key={title}
                                className="rounded-xl border bg-card/80 p-5 shadow-sm backdrop-blur"
                            >
                                <span className="mb-4 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                                    <Icon
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <h2 className="font-semibold text-card-foreground">
                                    {title}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
