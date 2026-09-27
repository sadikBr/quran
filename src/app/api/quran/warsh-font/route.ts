const WARSH_FONT_URL =
    "https://quranpedia.net/assets/fonts/arabic/UthmanicWarsh_V21.ttf";
const CACHE_SECONDS = 60 * 60 * 24 * 30;

export async function GET() {
    const response = await fetch(WARSH_FONT_URL, {
        next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
        return new Response("Warsh font unavailable", { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
        headers: {
            "Content-Type": "font/ttf",
            "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
        },
    });
}
