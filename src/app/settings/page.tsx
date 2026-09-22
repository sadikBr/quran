import { BookOpen, Languages, Palette, SlidersHorizontal } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import getPreferences from "@/features/settings/server/get-preferences";
import PreferenceCard from "@/features/settings/components/settings-card";

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const preferences = await getPreferences();

    return (
        <main className="min-h-dvh bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-4xl">
                <header className="flex items-center justify-between gap-4 border-b pb-5">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>
                        <div>
                            <p className="text-sm font-semibold tracking-wide">
                                Settings
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Signed in as {session.user.name}
                            </p>
                        </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/">Back home</Link>
                    </Button>
                </header>

                <section className="py-10 sm:py-14">
                    <p className="text-sm font-semibold tracking-[0.18em] text-primary">
                        READER PREFERENCES
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Make the reader yours.
                    </h1>
                    <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                        These are your current reading preferences. Editable
                        controls and saved settings will be available here soon.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <PreferenceCard
                            icon={Palette}
                            title="Appearance"
                            description="Choose how the application looks across every page."
                            label="Current theme"
                            value={preferences.theme}
                        />
                        <PreferenceCard
                            icon={BookOpen}
                            title="Arabic edition"
                            description="The Quran text edition used in the reader."
                            label="Current edition"
                            value={preferences.arabicEdition}
                        />
                        <PreferenceCard
                            icon={Languages}
                            title="Translation"
                            description="Set the English translation shown with the Arabic text."
                            label="Current edition"
                            value={preferences.translationEdition}
                        />
                        <PreferenceCard
                            icon={SlidersHorizontal}
                            title="Reading display"
                            description="Control whether translations appear below each surah."
                            label="Translations"
                            value={
                                preferences.showTranslation ? "Shown" : "Hidden"
                            }
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}
