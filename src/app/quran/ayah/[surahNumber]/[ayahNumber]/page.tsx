import { notFound } from "next/navigation";
import AyahActionsContent from "@/features/quran/components/ayah-actions-content";
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
        <main className="mx-auto flex h-full w-full max-w-2xl items-center p-4">
            <section className="w-full rounded-2xl border bg-card p-6 shadow-sm">
                <AyahActionsContent surahNumber={surah} ayahNumber={ayah} />
            </section>
        </main>
    );
}
