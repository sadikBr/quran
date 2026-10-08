import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import TodayTasks from "@/features/plans/components/today-tasks";
import { getTodayPlanView } from "@/features/plans/server/today";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function TodayPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const preferences = await getPreferences();
    const [view, surahs] = await Promise.all([
        getTodayPlanView(session.user.id, preferences),
        getSurahsMeta(),
    ]);
    return (
        <TodayTasks
            tasks={view.tasks}
            checklist={view.checklist}
            surahs={surahs}
        />
    );
}
