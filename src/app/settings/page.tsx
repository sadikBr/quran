import { BookOpen, SlidersHorizontal } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import getReadingProgress from "@/features/reading-progress/server/get-reading-progress";
import SettingsForm from "@/features/settings/components/settings-form";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const [preferences, editions, { reciters }, readingProgress] =
        await Promise.all([
            getPreferences(),
            getAvailableQuranEditions(),
            getAvailableReciters(),
            getReadingProgress(),
        ]);
    const savedNumber =
        preferences.readingMode === "page"
            ? readingProgress.lastPageNumber
            : readingProgress.lastSurahNumber;
    const continueReadingHref = `/quran/${preferences.readingMode}/${savedNumber ?? 1}`;

    const arabicEditions = editions.filter(
        (edition) =>
            edition.language === "ar" &&
            edition.format === "text" &&
            edition.type === "quran",
    );

    const translationEditions = editions.filter(
        (edition) =>
            edition.type === "translation" && edition.language === "en",
    );

    const tafsirEditions = editions.filter(
        (edition) => edition.type === "tafsir",
    );

    return (
        <main className="relative isolate min-h-dvh overflow-x-clip bg-background">
            <PageBackground />
            <div className="mx-auto max-w-6xl px-5 sm:px-6">
                <StickyAppHeader className="-mx-5 px-5 sm:-mx-6 sm:px-6">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-6" />
                        </span>
                        Quran Reader
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                        continueReadingHref={continueReadingHref}
                    />
                </StickyAppHeader>

                <section className="py-12 sm:py-16">
                    <div className="max-w-3xl">
                        <span className="flex size-8 items-center justify-center text-primary">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>
                        <p className="mt-4 text-[0.68rem] font-semibold tracking-[0.22em] text-primary">
                            READER PREFERENCES
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                            Shape your reading space.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Choose a reading flow, editions, and display details
                            that help you return to the Quran with focus.
                        </p>
                    </div>

                    <SettingsForm
                        preferences={preferences}
                        arabicEditions={arabicEditions}
                        reciters={reciters}
                        translationEditions={translationEditions}
                        tafsirEditions={tafsirEditions}
                    />
                </section>
            </div>
        </main>
    );
}
