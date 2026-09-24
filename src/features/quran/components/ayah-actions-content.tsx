import { notFound } from "next/navigation";
import getAyahActionsData from "../server/get-ayah-actions-data";
import AyahActions from "./ayah-actions";

export default async function AyahActionsContent({
    surahNumber,
    ayahNumber,
    closeOnCopy = false,
}: {
    surahNumber: number;
    ayahNumber: number;
    closeOnCopy?: boolean;
}) {
    const data = await getAyahActionsData(surahNumber, ayahNumber);

    if (!data) {
        notFound();
    }

    return <AyahActions {...data} closeOnCopy={closeOnCopy} />;
}
