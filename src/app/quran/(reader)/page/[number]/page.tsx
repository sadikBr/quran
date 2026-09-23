import QuranPage from "@/features/quran/components/quran-page";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";

export default async function Quran({
    params,
}: {
    params: Promise<{ number: number }>;
}) {
    const { number } = await params;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <QuranPage page={number} />
            <QuranPageNavigation currentNumber={number} readingMode="page" />
        </div>
    );
}
