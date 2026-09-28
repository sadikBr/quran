import type { ReactNode } from "react";
import AyahTargetScroller from "@/features/quran/components/ayah-target-scroller";
import QuranHeader from "@/features/quran/components/quran-header";
import ReaderPositionTracker from "@/features/quran/components/reader-position-tracker";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function QuranReaderLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { language, riwayah } = await getPreferences();

    return (
        <div
            lang={language}
            dir={getTextDirection(language)}
            className={cn(
                "flex h-full min-h-0 flex-col",
                language === "ar" && "arabic-ui",
            )}
        >
            <div className="quran-focus-chrome">
                <QuranHeader showSurahIndex riwayah={riwayah} />
            </div>
            <main
                id="quran-reader-main"
                tabIndex={-1}
                className="min-h-0 flex-1 overflow-hidden"
            >
                {children}
            </main>
            <ReaderPositionTracker />
            <AyahTargetScroller />
        </div>
    );
}
