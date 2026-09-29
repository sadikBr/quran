"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
    isHost,
}: {
    appId: string;
    roomName: string;
    token: string;
    groupId: string;
    locale: string;
    displayName: string;
    email: string;
    isHost: boolean;
}) {
    const t = useTranslations("Groups.meeting.room");
    const [sdkReady, setSdkReady] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem("jitsiLocalStorage", "{}");
        } finally {
            setSdkReady(true);
        }
    }, []);

    useEffect(() => {
        if (!isHost) return;

        const updatePresence = () =>
            fetch(`/api/groups/${groupId}/meeting/presence`, {
                method: "POST",
                keepalive: true,
            }).catch(() => null);

        void updatePresence();
        const interval = window.setInterval(updatePresence, 25_000);
        return () => window.clearInterval(interval);
    }, [groupId, isHost]);

    function leaveMeeting() {
        if (!isHost) return;
        void fetch(`/api/groups/${groupId}/meeting/presence`, {
            method: "DELETE",
            keepalive: true,
        });
    }

    return (
        <div className="flex h-dvh min-h-[34rem] flex-col overflow-hidden bg-[#11100f]">
            <header className="flex h-12 shrink-0 items-center border-white/10 border-b bg-[#171513] px-3 sm:px-4">
                <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-white/80 hover:bg-white/8 hover:text-white"
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
