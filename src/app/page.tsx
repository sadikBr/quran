import { ArrowRight, BookOpen, ChartNoAxesCombined, Heart } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

import SignOutButton from "@/components/signout-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";

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
        description: "Memorization goals and review progress are coming soon.",
    },
];

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

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
                        <div className="flex items-center gap-2">
                            <span className="hidden text-sm text-muted-foreground sm:block">
                                Salaam, {session.user.name}
                            </span>
                            <SignOutButton />
                        </div>
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
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button asChild size="lg">
                                <Link href="/quran/page/1">
                                    Start reading
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <Link href="/quran">Browse surahs</Link>
                            </Button>
                            {session && (
                                <Button asChild size="lg" variant="ghost">
                                    <Link href="/dashboard">My dashboard</Link>
                                </Button>
                            )}
                        </div>
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
