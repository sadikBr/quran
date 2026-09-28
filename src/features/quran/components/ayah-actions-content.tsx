import { notFound } from "next/navigation";
import type { Riwayah } from "@/features/settings/preferences";
import getAyahActionsData from "../server/get-ayah-actions-data";
import AyahActions from "./ayah-actions";

export default async function AyahActionsContent({
    surahNumber,
    ayahNumber,
    closeOnCopy = false,
    riwayah,
}: {
    surahNumber: number;
    ayahNumber: number;
    closeOnCopy?: boolean;
    riwayah?: Riwayah;
}) {
    const data = await getAyahActionsData(surahNumber, ayahNumber, riwayah);

    if (!data) {
        notFound();
    }

    return <AyahActions {...data} closeOnCopy={closeOnCopy} />;
}
