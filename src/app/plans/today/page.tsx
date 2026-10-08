import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import TodayTasks from "@/features/plans/components/today-tasks";
import { getTodayPlanTasks } from "@/features/plans/server/today";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function TodayPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const preferences = await getPreferences();
    const [tasks, surahs] = await Promise.all([
        getTodayPlanTasks(session.user.id, preferences),
        getSurahsMeta(),
    ]);
    return <TodayTasks tasks={tasks} surahs={surahs} />;
}
