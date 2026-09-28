import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/features/auth/auth";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";
import AyahActionsContent from "@/features/quran/components/ayah-actions-content";
import AyahActionsModal from "@/features/quran/components/ayah-actions-modal";
import QuranInfo from "@/lib/quran-info";

export default async function PracticeAyahActionsModalPage({
    params,
    searchParams,
}: {
    params: Promise<{ surahNumber: string; ayahNumber: string }>;
    searchParams: Promise<{ practice?: string }>;
}) {
    const { surahNumber, ayahNumber } = await params;
    const surah = Number(surahNumber);
    const ayah = Number(ayahNumber);
    const { practice } = await searchParams;
    const session = await auth.api.getSession({ headers: await headers() });
    const assignment = session
        ? await getPracticeAssignment(session.user.id, practice)
        : null;

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
                riwayah={assignment?.riwayah}
            />
        </AyahActionsModal>
    );
}
