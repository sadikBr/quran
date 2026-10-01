const HAFS_FONT_URL =
    "https://quranpedia.net/assets/fonts/arabic/UthmanicHafs_V22.ttf";
const CACHE_SECONDS = 60 * 60 * 24 * 30;

export async function GET() {
    const response = await fetch(HAFS_FONT_URL, {
        next: { revalidate: CACHE_SECONDS },
        signal: AbortSignal.timeout(30_000),
    }).catch(() => null);

    if (!response?.ok) {
        return new Response("Hafs font unavailable", { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
        headers: {
            "Content-Type": "font/ttf",
            "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
        },
    });
}
