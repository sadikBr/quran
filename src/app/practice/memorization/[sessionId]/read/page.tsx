import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import { memorizationReaderAssignment } from "@/features/learning/reader";
import { remainingReaderGroups } from "@/features/learning/remaining-reader-groups";
import { getMemorizationPlanView } from "@/features/learning/server/service";
import PracticeReader from "@/features/practice/components/practice-reader";
import PracticeReaderShell from "@/features/practice/components/practice-reader-shell";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import { getConnectingPassage } from "@/features/retention/server/connecting";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function WeeklyMemorizationReader({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    const [preferences, { sessionId }] = await Promise.all([
        getPreferences(),
        params,
    ]);
    const view = await getMemorizationPlanView(
        session.user.id,
        preferences.riwayah,
    );
    const item = view.sessions.find((s) => s.id === sessionId);
    if (!item?.active || !view.week) redirect("/practice");
    const assignment = memorizationReaderAssignment(item, view.week.riwayah);
    let groups = await getPracticeReaderData(assignment, preferences);
    if (!item.done && item.completed > 0)
        groups = remainingReaderGroups(assignment, groups, item.remaining);
    const first = groups[0]?.ayahs[0];
    const connecting = first
        ? await getConnectingPassage(session.user.id, assignment.riwayah, {
              surahNumber: groups[0].surah.number,
              ayahNumber: first.numberInSurah,
          })
        : [];
    return (
        <PracticeReaderShell language={preferences.language}>
            <PracticeReader
                key={`${item.id}:${item.completed}:${item.completedAt ?? ""}`}
                assignment={assignment}
                groups={groups}
                connecting={connecting}
                showTranslation={preferences.showTranslation}
                continuousRecitation={preferences.continuousRecitation}
            />
        </PracticeReaderShell>
    );
}
