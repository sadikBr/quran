import type { Language } from "@/features/settings/preferences";
import englishAssignmentsMessages from "@/messages/assignments.en.json";
import englishAuthMessages from "@/messages/auth.en.json";
import englishCommonMessages from "@/messages/common.en.json";
import englishDashboardMessages from "@/messages/dashboard.en.json";
import englishHomeMessages from "@/messages/en.json";
import englishGroupsMessages from "@/messages/groups.en.json";
import englishMemorizationMessages from "@/messages/memorization.en.json";
import englishPracticeMessages from "@/messages/practice.en.json";
import englishProfileMessages from "@/messages/profile.en.json";
import englishReaderMessages from "@/messages/reader.en.json";
import englishSettingsMessages from "@/messages/settings.en.json";
import englishWirdMessages from "@/messages/wird.en.json";

const englishMessages = {
    ...englishAuthMessages,
    ...englishCommonMessages,
    ...englishHomeMessages,
    ...englishGroupsMessages,
    ...englishMemorizationMessages,
    ...englishDashboardMessages,
    ...englishProfileMessages,
    ...englishPracticeMessages,
    ...englishReaderMessages,
    ...englishSettingsMessages,
    ...englishWirdMessages,
    ...englishAssignmentsMessages,
};

export type AppMessages = typeof englishMessages;

const messageLoaders: Record<
    Language,
    () => Promise<{ default: AppMessages }>
> = {
    en: async () => ({ default: englishMessages }),
    ar: async () => {
        const [
            auth,
            common,
            home,
            dashboard,
            groups,
            memorization,
            profile,
            practice,
            reader,
            settings,
            wird,
            assignments,
        ] = await Promise.all([
            import("@/messages/auth.ar.json"),
            import("@/messages/common.ar.json"),
            import("@/messages/ar.json"),
            import("@/messages/dashboard.ar.json"),
            import("@/messages/groups.ar.json"),
            import("@/messages/memorization.ar.json"),
            import("@/messages/profile.ar.json"),
            import("@/messages/practice.ar.json"),
            import("@/messages/reader.ar.json"),
            import("@/messages/settings.ar.json"),
            import("@/messages/wird.ar.json"),
            import("@/messages/assignments.ar.json"),
        ]);

        return {
            default: {
                ...auth.default,
                ...common.default,
                ...home.default,
                ...dashboard.default,
                ...groups.default,
                ...memorization.default,
                ...profile.default,
                ...practice.default,
                ...reader.default,
                ...settings.default,
                ...wird.default,
                ...assignments.default,
            },
        };
    },
};

export function getTextDirection(locale: Language) {
    return locale === "ar" ? "rtl" : "ltr";
}

export async function getMessages(locale: Language) {
    return (await messageLoaders[locale]()).default;
}
