import { BookOpen, SlidersHorizontal } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/features/auth/auth";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import SettingsForm from "@/features/settings/components/settings-form";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const [preferences, editions] = await Promise.all([
        getPreferences(),
        getAvailableQuranEditions(),
    ]);

    const arabicEditions = editions.filter(
        (edition) =>
            edition.language === "ar" &&
            (edition.type === "quran" || edition.format === "audio"),
    );

    const translationEditions = editions.filter(
        (edition) =>
            edition.type === "translation" && edition.language === "en",
    );

    const tafsirEditions = editions.filter(
        (edition) => edition.type === "tafsir",
    );

    return (
        <main className="min-h-dvh overflow-hidden bg-background bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,oklch(0.9_0.05_74.9889/0.42),transparent_70%)]">
            <div className="mx-auto max-w-5xl px-4">
                <header className="flex h-20 items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        Quran Reader
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                                PERSONAL READER
                            </p>
                            <p className="mt-0.5 text-sm font-medium">
                                {session.user.name}
                            </p>
                        </div>
                        <span className="flex size-9 items-center justify-center rounded-lg border bg-card/70 text-primary shadow-sm">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-4"
                            />
                        </span>
                    </div>
                </header>

                <section className="py-10 sm:py-14">
                    <div className="max-w-2xl">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>
                        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-primary">
                            READER PREFERENCES
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Shape your reading space.
                        </h1>
                        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                            Choose a reading flow, editions, and display details
                            that help you return to the Quran with focus.
                        </p>
                    </div>

                    <SettingsForm
                        preferences={preferences}
                        arabicEditions={arabicEditions}
                        translationEditions={translationEditions}
                        tafsirEditions={tafsirEditions}
                    />
                </section>
            </div>
        </main>
    );
}
