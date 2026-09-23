"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import type { AyahData } from "../types";
import getAyah from "./get-ayah";
import getAvailableQuranEditions from "./get-quran-edition";

export default async function getTafsirAyah(
    globalAyahNumber: number,
    editionIdentifier: string,
): Promise<AyahData> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("You must be signed in to choose a tafsir edition.");
    }

    const editions = await getAvailableQuranEditions();
    const edition = editions.find(
        (item) =>
            item.identifier === editionIdentifier && item.type === "tafsir",
    );

    if (!edition) {
        throw new Error("That tafsir edition is not available.");
    }

    return getAyah(globalAyahNumber, edition.identifier);
}
