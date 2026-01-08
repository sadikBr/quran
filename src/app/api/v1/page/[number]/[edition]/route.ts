import { PageData } from "@/types";

export const GET = async (
    _req: Request,
    { params }: { params: Promise<{ number: string; edition: string }> },
) => {
    const { number, edition } = await params;

    const pageData: PageData = await getPageData(Number(number), edition);

    return Response.json(pageData);
};

async function getPageData(number: number, edition: string = "quran-simple") {
    const url = `https://api.alquran.cloud/v1/page/${number}/${edition}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
