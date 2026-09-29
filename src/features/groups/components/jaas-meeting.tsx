"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function getMeetingUrl({
    appId,
    roomName,
    token,
    locale,
    displayName,
}: {
    appId: string;
    roomName: string;
    token: string;
    locale: string;
    displayName: string;
}) {
    const url = new URL(`https://8x8.vc/${appId}/${roomName}`);
    url.searchParams.set("jwt", token);
    url.searchParams.set("lang", locale === "ar" ? "ar" : "en");
    url.hash = new URLSearchParams({
        jwt: JSON.stringify(token),
        "config.prejoinConfig.enabled": "false",
        "config.disableInitialGUM": "true",
        "config.startWithAudioMuted": "true",
        "config.startWithVideoMuted": "true",
        "config.disableDeepLinking": "true",
        "userInfo.displayName": JSON.stringify(displayName),
        "appData.localStorageContent": JSON.stringify("{}"),
    }).toString();

    return url.toString();
}

export default function JaasMeeting({
    appId,
    roomName,
    token,
    groupId,
    locale,
    displayName,
    isHost,
}: {
    appId: string;
    roomName: string;
    token: string;
    groupId: string;
    locale: string;
    displayName: string;
    isHost: boolean;
}) {
    const t = useTranslations("Groups.meeting.room");
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const meetingUrl = useMemo(
        () => getMeetingUrl({ appId, roomName, token, locale, displayName }),
        [appId, displayName, locale, roomName, token],
    );

    useEffect(() => {
        if (loaded || failed) return;
        const timeout = window.setTimeout(() => setFailed(true), 20_000);
        return () => window.clearTimeout(timeout);
    }, [failed, loaded]);

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
            <div className="relative min-h-0 flex-1">
                <iframe
                    src={meetingUrl}
                    title={t("loading")}
                    className="h-full w-full border-0"
                    allow="autoplay; camera; clipboard-write; display-capture; fullscreen; microphone; screen-wake-lock; speaker-selection"
                    allowFullScreen
                    onLoad={() => {
                        setFailed(false);
                        setLoaded(true);
                    }}
                    onError={() => setFailed(true)}
                />
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background">
                        <div className="text-center">
                            <Video className="mx-auto size-7 text-primary" />
                            {failed ? (
                                <>
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        {t("loadError")}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-5 rounded-xl"
                                        onClick={() => window.location.reload()}
                                    >
                                        {t("retry")}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <LoaderCircle className="mx-auto mt-3 size-5 animate-spin text-primary/70" />
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        {t("loading")}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
