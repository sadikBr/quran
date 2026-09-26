import QuranSearch from "@/features/quran/components/quran-search";

export default async function QuranSearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q = "" } = await searchParams;

    return <QuranSearch initialQuery={q.slice(0, 200)} />;
}
