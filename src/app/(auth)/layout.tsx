import { BookOpen } from "lucide-react";
import Link from "next/link";
import { createTranslator } from "next-intl";
import type { ReactNode } from "react";
import AppPrimaryNav from "@/components/app-primary-nav";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

export default async function AuthLayout({
    children,
}: {
    children: ReactNode;
}) {
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Common",
    });
    return (
        <div
            lang={preferences.language}
            dir={preferences.language === "ar" ? "rtl" : "ltr"}
            className="relative isolate min-h-dvh overflow-x-clip bg-background"
        >
            <PageBackground />
            <StickyAppHeader className="px-4">
                <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-4">
                    <AppPrimaryNav />
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        {t("brand")}
                    </Link>
                </div>
            </StickyAppHeader>
            {children}
        </div>
    );
}
