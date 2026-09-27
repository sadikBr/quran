import type { Language } from "@/features/settings/preferences";
import englishAuthMessages from "@/messages/auth.en.json";
import englishCommonMessages from "@/messages/common.en.json";
import englishDashboardMessages from "@/messages/dashboard.en.json";
import englishHomeMessages from "@/messages/en.json";
import englishProfileMessages from "@/messages/profile.en.json";
import englishReaderMessages from "@/messages/reader.en.json";
import englishSettingsMessages from "@/messages/settings.en.json";
import englishWirdMessages from "@/messages/wird.en.json";

const englishMessages = {
    ...englishAuthMessages,
    ...englishCommonMessages,
    ...englishHomeMessages,
    ...englishDashboardMessages,
    ...englishProfileMessages,
    ...englishReaderMessages,
    ...englishSettingsMessages,
    ...englishWirdMessages,
};

export type AppMessages = typeof englishMessages;

const messageLoaders: Record<
    Language,
    () => Promise<{ default: AppMessages }>
> = {
    en: async () => ({ default: englishMessages }),
    ar: async () => {
        const [auth, common, home, dashboard, profile, reader, settings, wird] =
            await Promise.all([
                import("@/messages/auth.ar.json"),
                import("@/messages/common.ar.json"),
                import("@/messages/ar.json"),
                import("@/messages/dashboard.ar.json"),
                import("@/messages/profile.ar.json"),
                import("@/messages/reader.ar.json"),
                import("@/messages/settings.ar.json"),
                import("@/messages/wird.ar.json"),
            ]);

        return {
            default: {
                ...auth.default,
                ...common.default,
                ...home.default,
                ...dashboard.default,
                ...profile.default,
                ...reader.default,
                ...settings.default,
                ...wird.default,
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
