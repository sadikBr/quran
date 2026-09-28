import OfflineQuranReader from "@/features/offline/components/offline-quran-reader";
import getPreferences from "@/features/settings/server/get-preferences";

const labels = {
    en: {
        offline: "Available without internet",
        title: "Offline Quran",
        description:
            "The complete Quran is stored on this device. Reading remains available when your connection is weak or unavailable.",
        surah: "Choose a surah",
        hafs: "Hafs",
        warsh: "Warsh",
        translation: "Translation",
        backOnline: "Full reader",
        loading: "Opening your offline Quran…",
        unavailableTitle: "The offline library is not ready yet",
        unavailableDescription:
            "Reconnect once and keep the app open briefly so the complete Quran can finish downloading.",
        previous: "Previous",
        next: "Next",
        ayah: "ayahs",
        juz: "Juz",
    },
    ar: {
        offline: "متاح دون اتصال",
        title: "المصحف دون اتصال",
        description:
            "نُسخة كاملة من القرآن محفوظة على هذا الجهاز لتبقى القراءة متاحة عند ضعف الاتصال أو انقطاعه.",
        surah: "اختر سورة",
        hafs: "حفص",
        warsh: "ورش",
        translation: "الترجمة",
        backOnline: "القارئ الكامل",
        loading: "جارٍ فتح المصحف المحفوظ…",
        unavailableTitle: "لم يكتمل حفظ المصحف بعد",
        unavailableDescription:
            "اتصل بالإنترنت مرة واحدة واترك التطبيق مفتوحًا قليلًا حتى يكتمل تنزيل القرآن.",
        previous: "السابقة",
        next: "التالية",
        ayah: "آية",
        juz: "الجزء",
    },
} as const;

export default async function OfflinePage() {
    const preferences = await getPreferences();

    return (
        <OfflineQuranReader
            language={preferences.language}
            initialRiwayah={preferences.riwayah}
            initialShowTranslation={preferences.showTranslation}
            labels={labels[preferences.language]}
        />
    );
}
