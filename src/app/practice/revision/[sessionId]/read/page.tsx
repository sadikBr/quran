import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { remainingReaderGroups } from "@/features/learning/remaining-reader-groups";
import PracticeReader from "@/features/practice/components/practice-reader";
import PracticeReaderShell from "@/features/practice/components/practice-reader-shell";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import type { PracticeAssignment } from "@/features/practice/types";
import { getRevisionView } from "@/features/revision/server/service";
import getPreferences from "@/features/settings/server/get-preferences";
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
    if (!item?.active) redirect("/practice");
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
    if (!item.done && item.peer > 0)
        groups = remainingReaderGroups(assignment, groups, item.remaining);
    return (
        <PracticeReaderShell language={preferences.language}>
            <PracticeReader
                key={`${item.id}:${item.peer}:${item.completedAt ?? ""}`}
                assignment={assignment}
                groups={groups}
                showTranslation={preferences.showTranslation}
                continuousRecitation={preferences.continuousRecitation}
                weeklyOutcome={item.outcome}
            />
        </PracticeReaderShell>
    );
}
