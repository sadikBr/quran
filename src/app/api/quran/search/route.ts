import { NextResponse } from "next/server";
import searchQuran from "@/features/quran/server/search-quran";
import getPreferences from "@/features/settings/server/get-preferences";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const query =
        new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) ?? "";

    if (query.length < 2) {
        return NextResponse.json({ error: "query_too_short" }, { status: 400 });
    }

    try {
        const preferences = await getPreferences();
        const response = await searchQuran({
            query,
            arabicEdition: preferences.arabicEdition,
            translationEdition: preferences.translationEdition,
            riwayah: preferences.riwayah,
        });

        return NextResponse.json(response, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch (error) {
        console.error("Quran search failed.", error);
        return NextResponse.json(
            { error: "search_unavailable" },
            { status: 503 },
        );
    }
}
