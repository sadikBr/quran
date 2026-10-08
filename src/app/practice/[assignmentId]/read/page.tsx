import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import PracticeReader from "@/features/practice/components/practice-reader";
import PracticeReaderShell from "@/features/practice/components/practice-reader-shell";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import { getConnectingPassage } from "@/features/retention/server/connecting";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function PracticeReaderPage({
    params,
}: {
    params: Promise<{ assignmentId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { assignmentId } = await params;
    const [preferences, assignment] = await Promise.all([
        getPreferences(),
        getPracticeAssignment(session.user.id, assignmentId),
    ]);
    if (!assignment) redirect("/plans/today");

    const groups = await getPracticeReaderData(assignment, preferences);
    const connecting =
        assignment.kind === "memorization"
            ? await getConnectingPassage(
                  session.user.id,
                  assignment.riwayah,
                  assignment.start,
              )
            : [];

    return (
        <PracticeReaderShell language={preferences.language}>
            <PracticeReader
                key={assignment.id}
                assignment={assignment}
                groups={groups}
                connecting={connecting}
                showTranslation={preferences.showTranslation}
                continuousRecitation={preferences.continuousRecitation}
            />
        </PracticeReaderShell>
    );
}
