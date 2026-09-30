import type { ReactNode } from "react";
import getAvailableReciters from "../server/get-available-reciter";
import getSurahsMeta from "../server/get-surahs-meta";
import QuranAudioProvider from "./quran-audio-provider";

export default async function QuranAudioShell({
    children,
}: {
    children: ReactNode;
}) {
    const [catalog, surahs] = await Promise.all([
        getAvailableReciters().catch(() => ({ reciters: [] })),
        getSurahsMeta().catch(() => []),
    ]);
    return (
        <QuranAudioProvider
            catalog={{
                reciters: catalog.reciters.map((reciter) => ({
                    prefix: reciter.url.split("{")[0],
                    name: reciter.name,
                    arabicName: reciter.arabicName ?? reciter.name,
                })),
                surahs: surahs.map(({ number, name, englishName }) => ({
                    number,
                    name,
                    englishName,
                })),
            }}
        >
            {children}
        </QuranAudioProvider>
    );
}
