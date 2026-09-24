import QuranPage from "@/features/quran/components/quran-page";
import QuranPageNavigation from "@/features/quran/components/quran-page-navigation";
import ReadingProgressTracker from "@/features/reading-progress/components/reading-progress-tracker";

export default async function Quran({
    params,
}: {
    params: Promise<{ number: string }>;
}) {
    const { number } = await params;
    const pageNumber = Number(number);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ReadingProgressTracker locationType="page" number={pageNumber} />
            <div
                data-quran-swipe-content
                className="flex min-h-0 flex-1 flex-col"
            >
                <QuranPage page={pageNumber} />
            </div>
            <QuranPageNavigation
                currentNumber={pageNumber}
                readingMode="page"
            />
        </div>
    );
}
