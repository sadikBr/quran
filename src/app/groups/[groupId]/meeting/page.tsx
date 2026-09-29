import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { env } from "@/data/env/server";
import { auth } from "@/features/auth/auth";
import JaasMeeting from "@/features/groups/components/jaas-meeting";
import MeetingWaitingRoom from "@/features/groups/components/meeting-waiting-room";
import {
    createJaasToken,
    isJaasConfigured,
} from "@/features/groups/server/create-jaas-token";
import { getGroupMeetingForUser } from "@/features/groups/server/get-group-meeting";
import { calculateMeetingState } from "@/features/groups/server/meeting-schedule";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function GroupMeetingPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { groupId } = await params;
    const [meeting, preferences] = await Promise.all([
        getGroupMeetingForUser(groupId, session.user.id),
        getPreferences(),
    ]);
    if (!meeting) notFound();
    if (!isJaasConfigured() || !env.JAAS_APP_ID) {
        redirect(`/groups/${groupId}?meeting=unavailable`);
    }

    const state = calculateMeetingState(meeting);
    if (state.status !== "active" || !state.activeEndsAt) {
        redirect(`/groups/${groupId}?meeting=closed`);
    }

    const isHost = meeting.hostUserId === session.user.id;
    const hostPresent = Boolean(
        meeting.hostActiveUntil &&
            meeting.hostActiveUntil.getTime() > Date.now(),
    );

    if (!isHost && !hostPresent) {
        return (
            <MeetingWaitingRoom groupId={groupId} hostName={meeting.hostName} />
        );
    }

    const token = await createJaasToken({
        roomName: meeting.roomName,
        user: session.user,
        moderator: isHost,
        expiresAt: new Date(state.activeEndsAt),
    });

    return (
        <main lang={preferences.language} className="min-h-dvh bg-background">
            <JaasMeeting
                appId={env.JAAS_APP_ID}
                roomName={meeting.roomName}
                token={token}
                groupId={groupId}
                locale={preferences.language}
                displayName={session.user.name}
                email={session.user.email}
                canReview={isHost}
            />
        </main>
    );
}
