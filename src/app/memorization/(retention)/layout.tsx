import type { ReactNode } from "react";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import ToolNavigation from "@/features/retention/components/tool-navigation";
import { learnerContext } from "@/features/retention/server/context";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function RetentionLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { preferences } = await learnerContext();
    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />
                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <ToolNavigation />
                    {children}
                </section>
            </div>
        </main>
    );
}
