import { SlidersHorizontal } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";

import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { env } from "@/data/env/server";
import AdminPreferences from "@/features/admin/components/admin-preferences";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import SettingsNextStep from "@/features/onboarding/settings-next-step";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import type { Edition, Reciter } from "@/features/quran/types";
import SettingsForm from "@/features/settings/components/settings-form";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

function normalizeReciterName(value: string) {
    return value
        .toLocaleLowerCase()
        .replace(/quranexplorer\.com|ketaballah\.net/g, "")
        .replace(/[^a-z0-9]+/g, "")
        .trim();
}

function addArabicReciterNames(reciters: Reciter[], editions: Edition[]) {
    const audioEditions = editions.filter(
        (edition) => edition.format === "audio" && edition.language === "ar",
    );

    return reciters.map((reciter) => {
        if (reciter.arabicName) return reciter;

        const identifier = reciter.id.split("/").at(-1);
        const identifierMatch = audioEditions.find(
            (edition) => edition.identifier === identifier,
        );
        const normalizedName = normalizeReciterName(reciter.name);
        const nameMatch = audioEditions
            .map((edition) => ({
                edition,
                normalizedEnglishName: normalizeReciterName(
                    edition.englishName,
                ),
            }))
            .filter(
                ({ normalizedEnglishName }) =>
                    normalizedName === normalizedEnglishName ||
                    normalizedName.includes(normalizedEnglishName) ||
                    normalizedEnglishName.includes(normalizedName),
            )
            .sort(
                (first, second) =>
                    second.normalizedEnglishName.length -
                    first.normalizedEnglishName.length,
            )[0]?.edition;
        const arabicName = (identifierMatch ?? nameMatch)?.name;

        return arabicName ? { ...reciter, arabicName } : reciter;
    });
}

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const isAdmin = await isPlatformAdmin(session.user.id);
    const [preferences, editions, { reciters }, surahs] = await Promise.all([
        getPreferences(),
        isAdmin ? Promise.resolve([]) : getAvailableQuranEditions(),
        isAdmin ? Promise.resolve({ reciters: [] }) : getAvailableReciters(),
        isAdmin ? Promise.resolve([]) : getSurahsMeta().catch(() => []),
    ]);
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Settings",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home",
    });
    const adminT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Admin",
    });

    const arabicEditions = editions.filter(
        (edition) =>
            edition.language === "ar" &&
            edition.format === "text" &&
            edition.type === "quran",
    );

    const localizedReciters = addArabicReciterNames(reciters, editions);

    const translationEditions = editions.filter(
        (edition) =>
            edition.type === "translation" && edition.language === "en",
    );

    const tafsirEditions = editions.filter(
        (edition) => edition.type === "tafsir",
    );

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
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <div className="border-b border-border/60 pb-6">
                        <span className="flex size-8 items-center justify-center text-primary">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-5"
                            />
                        </span>
                        <p className="mt-4 text-[0.68rem] font-semibold tracking-[0.22em] text-primary">
                            {isAdmin ? adminT("account") : t("page.eyebrow")}
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {isAdmin
                                ? homeT("account.settings")
                                : t("page.title")}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                            {isAdmin
                                ? adminT("preferencesDescription")
                                : t("page.description")}
                        </p>
                    </div>

                    {isAdmin ? (
                        <AdminPreferences preferences={preferences} />
                    ) : (
                        <SettingsForm
                            surahs={surahs}
                            preferences={preferences}
                            vapidPublicKey={env.VAPID_PUBLIC_KEY ?? null}
                            arabicEditions={arabicEditions}
                            reciters={localizedReciters}
                            translationEditions={translationEditions}
                            tafsirEditions={tafsirEditions}
                        />
                    )}
                    {!isAdmin && <SettingsNextStep />}
                </section>
            </div>
        </main>
    );
}
