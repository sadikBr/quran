import { BookOpen } from "lucide-react";
import { createTranslator } from "next-intl";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

export default async function Loading() {
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Common",
    });
    return (
        <main
            lang={preferences.language}
            dir={preferences.language === "ar" ? "rtl" : "ltr"}
            aria-busy="true"
            aria-live="polite"
            className="flex min-h-dvh items-center justify-center bg-background p-6"
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <BookOpen aria-hidden="true" className="size-6" />
                </span>
                <div className="space-y-1">
                    <p className="font-semibold tracking-wide">{t("brand")}</p>
                    <p className="text-sm text-muted-foreground">
                        {t("loading.page")}
                    </p>
                </div>
                <span
                    aria-hidden="true"
                    className="size-5 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin"
                />
                <p className="sr-only">{t("loading.label")}</p>
            </div>
        </main>
    );
}
