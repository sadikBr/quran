import { ArrowLeft, CalendarRange } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
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
    if (!group.isActive || group.role !== "supervisor")
        redirect(`/groups/${groupId}`);

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
    const previousMeetingDate = planner.previousMeetingStartsAt
        ? new Date(planner.previousMeetingStartsAt)
        : null;
    const previousMeetingLabel = previousMeetingDate
        ? new Intl.DateTimeFormat(preferences.language, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: getMeetingDisplayTimezone(
                  meeting?.timezone ?? "Africa/Casablanca",
                  previousMeetingDate,
              ),
          }).format(previousMeetingDate)
        : null;
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

                <section className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <Link
                        href={`/groups/${groupId}`}
                        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ArrowLeft
                            aria-hidden="true"
                            className="size-4 shrink-0 rtl:rotate-180"
                        />
                        <bdi className="break-words">{group.name}</bdi>
                    </Link>
                    <PageHeading
                        title={t("title")}
                        description={t("description")}
                        icon={<CalendarRange />}
                    />

                    <MeetingPlanEditor
                        groupId={groupId}
                        members={group.members}
                        surahs={assignmentSurahs}
                        planner={planner}
                        previousMeetingLabel={previousMeetingLabel}
                        meetingOptions={meetingOptions}
                        navigationByRiwayah={{
                            hafs: hafsNavigation,
                            warsh: warshNavigation,
                        }}
                        locale={preferences.language}
                        riwayah={preferences.riwayah}
                    />
                </section>
            </div>
        </main>
    );
}
