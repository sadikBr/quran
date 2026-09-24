import type { ReactNode } from "react";
import AyahTargetScroller from "@/features/quran/components/ayah-target-scroller";
import QuranHeader from "@/features/quran/components/quran-header";

export default function QuranReaderLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <QuranHeader showSurahIndex />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
            <AyahTargetScroller />
        </div>
    );
}
