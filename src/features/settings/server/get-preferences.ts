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
        keepScreenAwake: settings.keepScreenAwake,
        vibration: settings.vibration,
        morningAdhkarTime: settings.morningAdhkarTime,
        eveningAdhkarTime: settings.eveningAdhkarTime,
        sleepAdhkarTime: settings.sleepAdhkarTime,
        adhkarTimezone: settings.adhkarTimezone,
        theme: settings.theme,
        language: settings.language,
        riwayah: settings.riwayah,
        arabicEdition: settings.arabicEdition,
        reciter: settings.reciter,
        translationEdition: settings.translationEdition,
        tafsirEdition: settings.tafsirEdition,
        showTranslation: settings.showTranslation,
        readingMode: settings.readingMode,
        continuousRecitation: settings.continuousRecitation,
        wirdRemindersEnabled: settings.wirdRemindersEnabled,
        meetingRemindersEnabled: settings.meetingRemindersEnabled,
        assignmentRemindersEnabled: settings.assignmentRemindersEnabled,
        arabicTextSize:
            settings.arabicTextSize >= 1 && settings.arabicTextSize <= 5
                ? (settings.arabicTextSize as Preferences["arabicTextSize"])
                : DEFAULT_PREFERENCES.arabicTextSize,
    };

    try {
        const [editions, { reciters }] = await Promise.all([
            getAvailableQuranEditions(),
            getAvailableReciters(),
        ]);
        return normalizeEditionPreferences(preferences, editions, reciters);
    } catch {
        // Edition validation uses the local Quranpedia catalogue even when
        // the reciter service is temporarily unavailable.
        const editions = await getAvailableQuranEditions();
        const normalized = normalizeEditionPreferences(
            preferences,
            editions,
            [],
        );
        return { ...normalized, reciter: preferences.reciter };
    }
}
