import {
    ArrowRight,
    BookOpen,
    ChartNoAxesCombined,
    Settings,
    Target,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import SignOutButton from "@/components/signout-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";

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

    return (
        <main className="min-h-dvh bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between gap-4 border-b pb-5">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        <span className="text-sm font-semibold tracking-wide">
                            Quran Reader
                        </span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                            <Link href="/settings">
                                <Settings aria-hidden="true" />
                                Settings
                            </Link>
                        </Button>
                        <SignOutButton />
                    </div>
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
                                Begin with the Quran.
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                Browse the surah index or open the first page to
                                begin a focused reading session.
                            </p>
                        </div>
                        <div className="mt-5 flex shrink-0 flex-wrap gap-3 sm:mt-0">
                            <Button asChild>
                                <Link href="/quran/page/1">
                                    Start reading
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
