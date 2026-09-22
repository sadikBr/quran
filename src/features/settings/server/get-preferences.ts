import "server-only";

import { DEFAULT_PREFERENCES, type Preferences } from "../preferences";
import { auth } from "@/features/auth/auth";
import { headers } from "next/headers";
import { userSettings } from "@/drizzle/schema";
import db from "@/drizzle/db";
import { eq } from "drizzle-orm";

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

    return {
        theme: settings.theme,
        arabicEdition: settings.arabicEdition,
        translationEdition: settings.translationEdition,
        showTranslation: settings.showTranslation,
    };
}
