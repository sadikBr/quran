import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import TasbihCounter from "@/features/adhkar/components/tasbih-counter";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function TasbihPage() {
    const { language } = await getPreferences();
    const ar = language === "ar";
    return (
        <main
            lang={language}
            dir={ar ? "rtl" : "ltr"}
            className={`relative isolate min-h-dvh bg-background ${ar ? "arabic-ui" : ""}`}
        >
            <PageBackground />
            <div className="app-container">
                <StickyAppHeader navigation />
                <TasbihCounter ar={ar} />
            </div>
        </main>
    );
}
