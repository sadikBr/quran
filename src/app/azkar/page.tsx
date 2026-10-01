import { Bell, CircleDot, MoonStar } from "lucide-react";
import Link from "next/link";
import ActionCard from "@/components/action-card";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import AdhkarCollections from "@/features/adhkar/components/adhkar-collections";
import data from "@/features/adhkar/data/collections.json";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function AdhkarPage() {
    const { language } = await getPreferences();
    const ar = language === "ar";
    return (
        <main
            lang={language}
            dir={ar ? "rtl" : "ltr"}
            className={`relative isolate min-h-dvh bg-background ${ar ? "arabic-ui" : ""}`}
        >
            <PageBackground />
            <div className="app-container ">
                <StickyAppHeader navigation />
                <PageHeading
                    className="mt-5 sm:mt-8"
                    title={ar ? "الأذكار" : "Adhkar"}
                    description={
                        ar
                            ? "لحظات من الذكر، تصحبك في يومك."
                            : "A quiet moment of remembrance in your day."
                    }
                    icon={<MoonStar />}
                    actions={
                        <Link
                            href="/settings#adhkar-reminders"
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Bell className="size-4" aria-hidden="true" />
                            {ar ? "ضبط التذكيرات" : "Set reminders"}
                        </Link>
                    }
                />
                <ActionCard
                    className="my-6"
                    href="/azkar/tasbih"
                    icon={<CircleDot />}
                    title={ar ? "المسبحة" : "Tasbih counter"}
                    description={
                        ar
                            ? "عدّ ذكرك بالوتيرة التي تناسبك."
                            : "Count your dhikr at your own pace."
                    }
                />
                <AdhkarCollections collections={data.collections} ar={ar} />
            </div>
        </main>
    );
}
