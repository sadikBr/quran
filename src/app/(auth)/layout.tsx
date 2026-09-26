import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";

export default function AuthLayout({ children }: { children: ReactNode }) {
    const locale = useLocale();
    const t = useTranslations("Common");
    return (
        <div
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            className="relative isolate min-h-dvh overflow-x-clip bg-background"
        >
            <PageBackground />
            <StickyAppHeader className="px-4">
                <div className="mx-auto flex h-20 w-full max-w-5xl items-center">
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
