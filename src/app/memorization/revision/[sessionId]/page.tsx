import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import PracticeReader from "@/features/practice/components/practice-reader";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import type { PracticeAssignment } from "@/features/practice/types";
import { getRevisionView } from "@/features/revision/server/service";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";
export default async function WeeklyRevisionReader({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    const [view, preferences, { sessionId }] = await Promise.all([
        getRevisionView(session.user.id),
        getPreferences(),
        params,
    ]);
    const item = view.sessions.find((s) => s.id === sessionId);
    if (!item || !view.plan?.enabled || (!item.available && !item.done))
        redirect("/memorization/revision");
    const assignment: PracticeAssignment = {
        id: item.id,
        source: "weekly",
        kind: "revision",
        riwayah: item.riwayah,
        start: {
            surahNumber: item.startSurahNumber,
            ayahNumber: item.startAyahNumber,
        },
        end: {
            surahNumber: item.endSurahNumber,
            ayahNumber: item.endAyahNumber,
        },
        progress:
            item.progressSurahNumber && item.progressAyahNumber
                ? {
                      surahNumber: item.progressSurahNumber,
                      ayahNumber: item.progressAyahNumber,
                  }
                : null,
        status: item.done ? "completed" : "in_progress",
        groupId: null,
        groupName: null,
        meetingTimezone: null,
        assignedByName: null,
        instructions: null,
        dueAt: null,
        reviewNote: null,
        submittedAt: null,
        reviewedAt: null,
        reviewMethod: item.done ? (item.completedAt ? "self" : "peer") : null,
    };
    let groups = await getPracticeReaderData(assignment, preferences);
    if (!item.done && item.peer > 0) {
        const remaining = new Set(item.remaining);
        groups = groups
            .map((g) => ({
                ...g,
                ayahs: g.ayahs.filter((a) =>
                    remaining.has(`${g.surah.number}:${a.numberInSurah}`),
                ),
            }))
            .filter((g) => g.ayahs.length);
        const last = groups.at(-1);
        if (last) {
            const ayah = last.ayahs.at(-1);
            if (ayah)
                assignment.end = {
                    surahNumber: last.surah.number,
                    ayahNumber: ayah.numberInSurah,
                };
        }
    }
    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "h-dvh overflow-y-auto bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 bg-background/92 backdrop-blur-xl">
                <div className="app-container flex h-16 items-center justify-between gap-4">
                    <AppPrimaryNav />
                    <AppLogo />
                </div>
            </header>
            <PracticeReader
                key={`${item.id}:${item.peer}:${item.completedAt ?? ""}`}
                assignment={assignment}
                groups={groups}
                showTranslation={preferences.showTranslation}
                continuousRecitation={preferences.continuousRecitation}
                weeklyOutcome={item.outcome}
            />
        </main>
    );
}
