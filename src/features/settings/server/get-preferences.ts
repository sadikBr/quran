import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import db from "@/drizzle/db";
import { userSettings } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import getAvailableReciters from "@/features/quran/server/get-available-reciter";
import getAvailableQuranEditions from "@/features/quran/server/get-quran-edition";
import { normalizeEditionPreferences } from "../edition-compatibility";
import { DEFAULT_PREFERENCES, type Preferences } from "../preferences";

export default async function getPreferences(): Promise<Preferences> {
    var session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { ...DEFAULT_PREFERENCES };
    }

    const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, session.user.id))
        .limit(1);

    if (!settings) {
        return { ...DEFAULT_PREFERENCES };
    }

    const preferences: Preferences = {
        theme: settings.theme,
        arabicEdition: settings.arabicEdition,
        reciter: settings.reciter,
        translationEdition: settings.translationEdition,
        tafsirEdition: settings.tafsirEdition,
        showTranslation: settings.showTranslation,
        readingMode: settings.readingMode,
        continuousRecitation: settings.continuousRecitation,
    };

    try {
        const [editions, { reciters }] = await Promise.all([
            getAvailableQuranEditions(),
            getAvailableReciters(),
        ]);
        return normalizeEditionPreferences(preferences, editions, reciters);
    } catch {
        return preferences;
    }
}
