import { notFound } from "next/navigation";
import AyahActionsContent from "@/features/quran/components/ayah-actions-content";
import AyahActionsModal from "@/features/quran/components/ayah-actions-modal";
import QuranInfo from "@/lib/quran-info";

export default async function AyahActionsModalPage({
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
        <AyahActionsModal>
            <AyahActionsContent
                surahNumber={surah}
                ayahNumber={ayah}
                closeOnCopy
            />
        </AyahActionsModal>
    );
}
