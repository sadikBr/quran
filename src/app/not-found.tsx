import Link from "next/link";
import { createTranslator } from "next-intl";

import { Button } from "@/components/ui/button";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

export default async function NotFound() {
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
            className="flex min-h-screen items-center justify-center p-6"
        >
            <section className="flex max-w-md flex-col items-center gap-5 text-center">
                <p className="text-7xl font-semibold tracking-[0.2em] text-primary">
                    {t("notFound.code")}
                </p>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">
                        {t("notFound.title")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("notFound.description")}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                        <Link href="/quran">{t("notFound.browse")}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/quran/page/1">
                            {t("notFound.openFirstPage")}
                        </Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
