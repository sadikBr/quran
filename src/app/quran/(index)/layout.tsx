import type { ReactNode } from "react";
import BackToTopButton from "@/features/quran/components/back-to-top-button";
import QuranHeader from "@/features/quran/components/quran-header";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function QuranIndexLayout({
    children,
}: {
    children: ReactNode;
}) {
    const preferences = await getPreferences();

    return (
        <div
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "flex h-full min-h-0 flex-col",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <QuranHeader />
            <main
                id="quran-reader-main"
                tabIndex={-1}
                className="min-h-0 flex-1 overflow-hidden"
            >
                {children}
            </main>
            <BackToTopButton />
        </div>
    );
}
