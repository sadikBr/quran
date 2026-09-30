import { type ReactNode, Suspense } from "react";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function AuthLayout({
    children,
}: {
    children: ReactNode;
}) {
    const preferences = await getPreferences();
    return (
        <div
            lang={preferences.language}
            dir={preferences.language === "ar" ? "rtl" : "ltr"}
            className="relative isolate min-h-dvh overflow-x-clip bg-background"
        >
            <PageBackground />
            <StickyAppHeader>
                <div className="app-container flex h-full items-center justify-between gap-4">
                    <AppPrimaryNav />
                    <AppLogo />
                </div>
            </StickyAppHeader>
            <Suspense>{children}</Suspense>
        </div>
    );
}
