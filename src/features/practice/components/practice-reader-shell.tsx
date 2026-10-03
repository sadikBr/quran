import type { ReactNode } from "react";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import type { Language } from "@/features/settings/preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default function PracticeReaderShell({
    language,
    children,
}: {
    language: Language;
    children: ReactNode;
}) {
    return (
        <main
            data-quran-scroll-container
            lang={language}
            dir={getTextDirection(language)}
            className={cn(
                "h-dvh overflow-y-auto bg-background",
                language === "ar" && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 bg-background/92 backdrop-blur-xl">
                <div className="app-container flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-4 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))]">
                    <AppPrimaryNav />
                    <AppLogo />
                </div>
            </header>
            {children}
        </main>
    );
}
