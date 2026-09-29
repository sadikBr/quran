"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import AppPrimaryNav from "@/components/app-primary-nav";
import { Button } from "@/components/ui/button";

const JaaSMeeting = dynamic(
    () => import("@jitsi/react-sdk").then((module) => module.JaaSMeeting),
    { ssr: false },
);

function MeetingSpinner() {
    const t = useTranslations("Groups.meeting.room");

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="text-center">
                <Video className="mx-auto size-7 text-primary" />
                <LoaderCircle className="mx-auto mt-3 size-5 animate-spin text-primary/70" />
                <p className="mt-4 text-sm text-muted-foreground">
                    {t("loading")}
                </p>
            </div>
        </div>
    );
}

export default function JaasMeeting({
    appId,
    roomName,
    token,
    groupId,
    locale,
    displayName,
    email,
}: {
    appId: string;
    roomName: string;
    token: string;
    groupId: string;
    locale: string;
    displayName: string;
    email: string;
}) {
    const t = useTranslations("Groups.meeting.room");
    const [sdkReady, setSdkReady] = useState(false);
    const joinedRef = useRef(false);
    const heartbeatRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            window.localStorage.setItem("jitsiLocalStorage", "{}");
        } finally {
            setSdkReady(true);
        }
    }, []);

    const leaveMeeting = useCallback(() => {
        if (!joinedRef.current) return;
        joinedRef.current = false;
        if (heartbeatRef.current !== null) {
            window.clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        void fetch(`/api/groups/${groupId}/meeting/presence`, {
            method: "DELETE",
            keepalive: true,
        });
    }, [groupId]);

    const joinMeeting = useCallback(() => {
        if (joinedRef.current) return;
        joinedRef.current = true;
        const updatePresence = () =>
            fetch(`/api/groups/${groupId}/meeting/presence`, {
                method: "POST",
                keepalive: true,
            }).catch(() => null);

        void updatePresence();
        heartbeatRef.current = window.setInterval(updatePresence, 25_000);
    }, [groupId]);

    useEffect(() => {
        const handlePageHide = () => leaveMeeting();
        window.addEventListener("pagehide", handlePageHide);
        return () => {
            window.removeEventListener("pagehide", handlePageHide);
            leaveMeeting();
        };
    }, [leaveMeeting]);

    return (
        <div className="flex h-dvh min-h-[34rem] flex-col overflow-hidden bg-[#11100f]">
            <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 border-border/60 border-b bg-background px-3 pt-[env(safe-area-inset-top)] text-foreground sm:h-[calc(5rem+env(safe-area-inset-top))] sm:px-4">
                <AppPrimaryNav />
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                    <Link href={`/groups/${groupId}`} onClick={leaveMeeting}>
                        <LogOut className="size-4" />
                        {t("leave")}
                    </Link>
                </Button>
            </header>
            <div className="relative min-h-0 flex-1 [&>div]:h-full [&_iframe]:h-full [&_iframe]:w-full">
                {sdkReady ? (
                    <JaaSMeeting
                        appId={appId}
                        roomName={roomName}
                        jwt={token}
                        lang={locale === "ar" ? "ar" : "en"}
                        userInfo={{ displayName, email }}
                        configOverwrite={{
                            prejoinConfig: {
                                enabled: false,
                                hideDisplayName: true,
                            },
                            disableInitialGUM: true,
                            startWithAudioMuted: true,
                            startWithVideoMuted: true,
                            disableDeepLinking: true,
                        }}
                        interfaceConfigOverwrite={{
                            MOBILE_APP_PROMO: false,
                        }}
                        onApiReady={(api) => {
                            api.addEventListener(
                                "videoConferenceJoined",
                                joinMeeting,
                            );
                            api.addEventListener(
                                "videoConferenceLeft",
                                leaveMeeting,
                            );
                        }}
                        onReadyToClose={() => {
                            leaveMeeting();
                            window.location.assign(`/groups/${groupId}`);
                        }}
                        spinner={MeetingSpinner}
                        getIFrameRef={(parentNode) => {
                            parentNode.style.height = "100%";
                            parentNode.style.width = "100%";
                        }}
                    />
                ) : (
                    <MeetingSpinner />
                )}
            </div>
        </div>
    );
}
