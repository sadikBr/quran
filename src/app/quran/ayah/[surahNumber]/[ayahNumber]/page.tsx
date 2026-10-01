import { notFound } from "next/navigation";
import { Suspense } from "react";
import AyahActionsContent from "@/features/quran/components/ayah-actions-content";
import AyahActionsLoading from "@/features/quran/components/ayah-actions-loading";
import QuranInfo from "@/lib/quran-info";

export default async function AyahActionsPage({
    params,
}: {
    params: Promise<{ surahNumber: string; ayahNumber: string }>;
}) {
    const { surahNumber, ayahNumber } = await params;
    const surah = Number(surahNumber);
    const ayah = Number(ayahNumber);

    if (
        !Number.isInteger(surah) ||
        surah < QuranInfo.minSurahNumber ||
        surah > QuranInfo.maxSurahNumber ||
        !Number.isInteger(ayah) ||
        ayah < 1
    ) {
        notFound();
    }

    return (
        <main className="mx-auto flex h-full min-h-0 w-full max-w-2xl items-start overflow-y-auto px-3 py-4 sm:items-center sm:px-4">
            <section className="app-card w-full min-w-0 p-4 sm:p-5">
                <Suspense fallback={<AyahActionsLoading />}>
                    <AyahActionsContent surahNumber={surah} ayahNumber={ayah} />
                </Suspense>
            </section>
        </main>
    );
}
