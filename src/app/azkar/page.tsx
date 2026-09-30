import { Bell, MoonStar } from "lucide-react";
import Link from "next/link";
import PageBackground from "@/components/page-background";
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
                <header className="flex items-center justify-between gap-4 pb-6 pt-5 sm:pb-8 sm:pt-8">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 sm:size-14">
                            <MoonStar
                                aria-hidden="true"
                                className="size-6 text-primary"
                            />
                        </span>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {ar ? "الأذكار" : "Adhkar"}
                            </h1>
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                {ar
                                    ? "لحظات من الذكر، تصحبك في يومك."
                                    : "A quiet moment of remembrance in your day."}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/settings#adhkar-reminders"
                        aria-label={ar ? "ضبط التذكيرات" : "Set reminders"}
                        title={ar ? "ضبط التذكيرات" : "Set reminders"}
                        className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card/50 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-auto sm:rounded-xl sm:px-4"
                    >
                        <Bell className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {ar ? "ضبط التذكيرات" : "Set reminders"}
                        </span>
                    </Link>
                </header>
                <Link
                    href="/azkar/tasbih"
                    className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <div>
                        <h2 className="font-semibold text-primary">
                            {ar ? "المسبحة" : "Tasbih counter"}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {ar
                                ? "عداد مستقل لذكرك الشخصي، دون عدد محدد."
                                : "A separate counter for personal dhikr, without a target."}
                        </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-primary">
                        {ar ? "ابدأ العدّ" : "Start counting"}
                    </span>
                </Link>
                <AdhkarCollections collections={data.collections} ar={ar} />
            </div>
        </main>
    );
}
