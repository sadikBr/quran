import { CalendarRange } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { auth } from "@/features/auth/auth";
import MeetingPlanEditor from "@/features/groups/components/meeting-plan-editor";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { getGroupForUser } from "@/features/groups/server/get-groups";
import getMeetingPlannerData from "@/features/groups/server/get-meeting-planner-data";
import {
    getMeetingDisplayTimezone,
    getUpcomingMeetingOccurrences,
} from "@/features/groups/server/meeting-schedule";
import getQuranNavigationMeta from "@/features/quran/server/get-quran-navigation-meta";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import {
    getWarshChapters,
    getWarshNavigationMeta,
} from "@/features/quran/server/get-warsh-mushaf";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function MeetingPlanPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { groupId } = await params;
    const [preferences, group] = await Promise.all([
        getPreferences(),
        getGroupForUser(groupId, session.user.id),
    ]);
    if (!group) notFound();
    if (group.role !== "supervisor") redirect(`/groups/${groupId}`);

    const [
        planner,
        meeting,
        surahs,
        warshChapters,
        hafsNavigation,
        warshNavigation,
        messages,
    ] = await Promise.all([
        getMeetingPlannerData(groupId),
        getGroupMeetingForUser(groupId, session.user.id),
        getSurahsMeta(),
        getWarshChapters(),
        getQuranNavigationMeta(),
        getWarshNavigationMeta(),
        getMessages(preferences.language),
    ]);
    const warshCounts = new Map(
        warshChapters.map((chapter) => [chapter.id, chapter.verses.length]),
    );
    const assignmentSurahs = surahs.map((surah) => ({
        number: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        hafsAyahCount: surah.numberOfAyahs,
        warshAyahCount: warshCounts.get(surah.number) ?? surah.numberOfAyahs,
    }));
    const meetingOptions = meeting
        ? getUpcomingMeetingOccurrences({ ...meeting, limit: 12 }).map(
              (startsAt) => {
                  const startsAtDate = new Date(startsAt);
                  return {
                      startsAt,
                      label: new Intl.DateTimeFormat(preferences.language, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: getMeetingDisplayTimezone(
                              meeting.timezone,
                              startsAtDate,
                          ),
                      }).format(startsAtDate),
                  };
              },
          )
        : [];
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.planner",
    });
    const isArabic = preferences.language === "ar";

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container ">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />

                <section className="py-10 sm:py-14">
                    <div className="flex max-w-3xl items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <CalendarRange className="size-6" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                                {t("eyebrow")}
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {t("title")}
                            </h1>
                            <p className="mt-3 leading-7 text-muted-foreground">
                                {t("description")}
                            </p>
                        </div>
                    </div>

                    <MeetingPlanEditor
                        groupId={groupId}
                        members={group.members}
                        surahs={assignmentSurahs}
                        planner={planner}
                        meetingOptions={meetingOptions}
                        navigationByRiwayah={{
                            hafs: hafsNavigation,
                            warsh: warshNavigation,
                        }}
                        locale={preferences.language}
                    />
                </section>
            </div>
        </main>
    );
}
