import SurahFrame from "@/components/surah-frame";
import { SurahType } from "@/types";

export default async function IndexPage() {
    const response = await fetch("http://localhost:3000/api/v1/surahs-meta");
    const surahs: SurahType[] = await response.json();

    return (
        <div className="flex flex-col gap-2 p-4 max-w-lg mx-auto">
            <div className="flex items-center justify-around mb-4">
                <div className="border-2 border-accent bg-primary px-4 py-2">
                    Meccan
                </div>
                <div className="border-2 border-primary bg-accent px-4 py-2">
                    Medinan
                </div>
            </div>
            {surahs.map((surah) => (
                <SurahFrame key={surah.number} surah={surah} />
            ))}
        </div>
    );
}
