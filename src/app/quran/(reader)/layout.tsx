import type { ReactNode } from "react";
import AyahTargetScroller from "@/features/quran/components/ayah-target-scroller";
import QuranHeader from "@/features/quran/components/quran-header";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function QuranReaderLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { language } = await getPreferences();

    return (
        <div
            lang={language}
            dir={getTextDirection(language)}
            className={cn(
                "flex h-full min-h-0 flex-col",
                language === "ar" && "arabic-ui",
            )}
        >
            <QuranHeader showSurahIndex />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
            <AyahTargetScroller />
        </div>
    );
}
