import QuranIndex from "@/features/quran/components/quran-index";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import type { SurahType } from "@/features/quran/types";

export default async function IndexPage() {
    const surahs: SurahType[] = await getSurahsMeta();

    return <QuranIndex surahs={surahs} />;
}
