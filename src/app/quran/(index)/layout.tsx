import type { ReactNode } from "react";
import QuranHeader from "@/features/quran/components/quran-header";
import getReadingHref from "@/features/quran/helpers/get-reading-href";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function QuranIndexLayout({
    children,
}: {
    children: ReactNode;
}) {
    const preferences = await getPreferences();
    const startReadingHref = getReadingHref(1, preferences);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <QuranHeader startReadingHref={startReadingHref} />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
