import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import GuideDirectory from "@/features/onboarding/guide-directory";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";

export default async function GuidePage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const preferences = await getPreferences();
    return (
        <main
            dir={getTextDirection(preferences.language)}
            lang={preferences.language}
            className={`min-h-dvh bg-background ${preferences.language === "ar" ? "arabic-ui" : ""}`}
        >
            <div className="app-container pb-10">
                <StickyAppHeader navigation />
                <GuideDirectory />
            </div>
        </main>
    );
}
