import { SurahType } from "@/types";

export const GET = async (_req: Request) => {
    const surahsMeta = await getSurahsMeta();
    return Response.json(surahsMeta);
};

async function getSurahsMeta(): Promise<SurahType[]> {
    const url = "https://api.alquran.cloud/v1/meta";
    const response = await fetch(url);
    const data = await response.json();
    return data.data.surahs.references;
}
