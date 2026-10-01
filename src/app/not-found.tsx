import { BookOpen, LayoutDashboard, SearchX } from "lucide-react";
import Link from "next/link";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
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
            className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-background p-4 sm:p-6"
        >
            <PageBackground />
            <section className="relative w-full max-w-lg overflow-hidden app-card p-5 text-center sm:p-8">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <SearchX aria-hidden="true" className="size-6" />
                </span>
                <p className="mt-5 text-sm font-bold tracking-[0.18em] text-primary">
                    {t("notFound.code")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                    {t("notFound.title")}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                    {t("notFound.description")}
                </p>
                <div className="mt-7 grid gap-2 min-[420px]:grid-cols-2">
                    <Button asChild className="min-h-11 rounded-xl">
                        <Link href="/quran">
                            <BookOpen aria-hidden="true" className="size-4" />
                            {t("notFound.browse")}
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-11 rounded-xl"
                    >
                        <Link href="/dashboard">
                            <LayoutDashboard
                                aria-hidden="true"
                                className="size-4"
                            />
                            {t("error.dashboard")}
                        </Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
