import QuranIndex from "@/features/quran/components/quran-index";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";

export default async function IndexPage() {
    const [surahs, navigation] = await Promise.all([
        getSurahsMeta(),
        getQuranNavigationMeta(),
    ]);

    return <QuranIndex surahs={surahs} navigation={navigation} />;
}
