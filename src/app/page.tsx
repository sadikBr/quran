import { ArrowRight, BookOpen, ChartNoAxesCombined, Heart } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import getPreferences from "@/features/settings/server/get-preferences";

const features = [
    {
        icon: BookOpen,
        title: "Read without friction",
        description:
            "Move through the Quran by page or surah in a focused, uncluttered reading view.",
    },
    {
        icon: Heart,
        title: "Return in your own time",
        description:
            "A calm place for the moments you make for daily reading and reflection.",
    },
    {
        icon: ChartNoAxesCombined,
        title: "Keep your place",
        description:
            "Your dashboard remembers where you stopped, ready for the next time you return.",
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
        <main className="relative isolate min-h-dvh overflow-x-clip bg-background">
            <PageBackground />
            <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
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

                    {session ? (
                        <UserMenu
                            name={session.user.name}
                            image={session.user.image}
                            continueReadingHref={href}
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
                </StickyAppHeader>

                <section className="flex flex-1 flex-col py-14 sm:py-20">
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-16">
                        <div className="max-w-3xl">
                            <p className="mb-6 text-xs font-semibold tracking-[0.22em] text-primary">
                                QURAN READER
                            </p>
                            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                                Return to the Quran in your own time.
                            </h1>
                            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                                A calm reading space for the moments you set
                                aside to read, reflect, and continue your
                                journey.
                            </p>
                            {session ? (
                                <div className="mt-9">
                                    <Button asChild size="lg">
                                        <Link href="/dashboard">
                                            My dashboard
                                            <ArrowRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        <Link
                                            href={href}
                                            className="font-medium text-foreground underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {continueReadingLabel}
                                        </Link>
                                        <span
                                            aria-hidden="true"
                                            className="text-primary/50"
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
                                <div className="mt-9 flex flex-wrap gap-3">
                                    <Button asChild size="lg">
                                        <Link href={href}>
                                            Start reading
                                            <ArrowRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="ghost">
                                        <Link href="/quran">Browse surahs</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div
                            aria-hidden="true"
                            className="relative mx-auto hidden aspect-square w-full max-w-80 lg:block"
                        >
                            <div className="absolute inset-0 rounded-full bg-primary/4.5" />
                            <div className="absolute inset-5 rounded-full border border-primary/15" />
                            <div className="absolute inset-14 rounded-full border border-primary/20" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_20px_50px_-20px_hsl(var(--primary))]">
                                    <BookOpen className="size-10" />
                                </span>
                            </div>
                            <span className="absolute top-7 left-1/2 -translate-x-1/2 bg-background/70 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                                Read
                            </span>
                            <span className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-background/70 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-primary uppercase">
                                Reflect
                            </span>
                        </div>
                    </div>

                    <section
                        className="mt-20 sm:mt-28"
                        aria-labelledby="home-features"
                    >
                        <div className="max-w-xl">
                            <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                                DESIGNED FOR RETURNING
                            </p>
                            <h2
                                id="home-features"
                                className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
                            >
                                A reader that stays out of your way.
                            </h2>
                        </div>
                        <div className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">
                            {features.map(
                                ({ icon: Icon, title, description }) => (
                                    <article key={title} className="flex gap-4">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                            <Icon
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-foreground">
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
