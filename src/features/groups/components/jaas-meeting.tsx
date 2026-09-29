"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import AppPrimaryNav from "@/components/app-primary-nav";
import { Button } from "@/components/ui/button";
import MeetingReviewPanel from "./meeting-review-panel";

type MeetingApi = {
    executeCommand: (command: string) => void;
    dispose: () => void;
};

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
    canReview = false,
}: {
    appId: string;
    roomName: string;
    token: string;
    groupId: string;
    locale: string;
    displayName: string;
    email: string;
    canReview?: boolean;
}) {
    const t = useTranslations("Groups.meeting.room");
    const [sdkReady, setSdkReady] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewVisited, setReviewVisited] = useState(false);
    const reviewT = useTranslations("Groups.review");
    const router = useRouter();
    const apiRef = useRef<MeetingApi | null>(null);
    const leavingRef = useRef(false);
    const closedRef = useRef(false);
    const mountedRef = useRef(false);
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const joinedRef = useRef(false);
    const heartbeatRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            window.localStorage.setItem("jitsiLocalStorage", "{}");
        } finally {
            setSdkReady(true);
        }
    }, []);

    const clearPresence = useCallback(() => {
        if (!joinedRef.current) return;
        joinedRef.current = false;
        if (heartbeatRef.current !== null) {
            window.clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        void fetch(`/api/groups/${groupId}/meeting/presence`, {
            method: "DELETE",
            keepalive: true,
        }).catch(() => null);
    }, [groupId]);

    const disposeMeeting = useCallback(() => {
        if (exitTimerRef.current !== null) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }
        const api = apiRef.current;
        apiRef.current = null;
        try {
            api?.dispose();
        } finally {
            clearPresence();
        }
    }, [clearPresence]);

    const finishLeaving = useCallback(() => {
        if (!mountedRef.current || closedRef.current) return;
        closedRef.current = true;
        leavingRef.current = true;
        setLeaving(true);
        try {
            disposeMeeting();
        } finally {
            router.replace(`/groups/${groupId}`);
        }
    }, [disposeMeeting, groupId, router]);

    const leaveMeeting = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        setLeaving(true);
        const api = apiRef.current;
        if (!api) {
            finishLeaving();
            return;
        }
        // Keep the iframe alive until Jitsi completes its hang-up signalling.
        // A stalled iframe must not trap the user on this page.
        exitTimerRef.current = setTimeout(finishLeaving, 5000);
        try {
            api.executeCommand("hangup");
        } catch {
            finishLeaving();
        }
    }, [finishLeaving]);

    const joinMeeting = useCallback(() => {
        if (joinedRef.current || leavingRef.current || !mountedRef.current)
            return;
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
        mountedRef.current = true;
        const disconnect = () => {
            leavingRef.current = true;
            try {
                apiRef.current?.executeCommand("hangup");
            } catch {
                // The iframe may already have closed during navigation.
            } finally {
                disposeMeeting();
            }
        };
        const handlePageHide = () => {
            mountedRef.current = false;
            disconnect();
        };
        // A restored bfcache page must initialize a new, usable conference.
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) window.location.reload();
        };
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("pageshow", handlePageShow);
        return () => {
            mountedRef.current = false;
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);
            disconnect();
            leavingRef.current = false;
        };
    }, [disposeMeeting]);

    return (
        <div className="flex h-dvh min-h-[34rem] flex-col overflow-hidden bg-[#11100f]">
            <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-border/60 border-b bg-background px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-foreground sm:min-h-20 sm:flex-nowrap sm:px-4">
                <AppPrimaryNav />
                {canReview && (
                    <Button
                        variant="outline"
                        size="sm"
                        aria-expanded={reviewOpen}
                        aria-controls="meeting-review-panel"
                        className="order-last w-full sm:order-none sm:w-auto"
                        onClick={() => {
                            setReviewVisited(true);
                            setReviewOpen((open) => !open);
                        }}
                    >
                        {reviewT(
                            reviewOpen ? "backToMeeting" : "openInMeeting",
                        )}
                    </Button>
                )}
                <Button
                    onClick={leaveMeeting}
                    disabled={leaving}
                    aria-busy={leaving}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                    {leaving ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <LogOut className="size-4" />
                    )}
                    {t("leave")}
                </Button>
            </header>
            <div className="relative flex min-h-0 flex-1">
                <div
                    className={`relative min-h-0 min-w-0 flex-1 [&>div]:h-full [&_iframe]:h-full [&_iframe]:w-full ${reviewOpen ? "max-lg:invisible" : ""}`}
                >
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
                                if (!mountedRef.current || leavingRef.current) {
                                    try {
                                        api.executeCommand("hangup");
                                    } finally {
                                        api.dispose();
                                    }
                                    return;
                                }
                                apiRef.current = api;
                                api.addEventListener(
                                    "videoConferenceJoined",
                                    joinMeeting,
                                );
                                api.addEventListener(
                                    "videoConferenceLeft",
                                    clearPresence,
                                );
                            }}
                            onReadyToClose={finishLeaving}
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
                {canReview && (
                    <aside
                        id="meeting-review-panel"
                        aria-label={reviewT("openInMeeting")}
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        hidden={!reviewOpen}
                        className="absolute inset-0 overflow-y-auto overscroll-contain bg-background p-4 text-foreground lg:static lg:w-[min(44rem,48vw)] lg:shrink-0 lg:border-s lg:p-6"
                    >
                        {reviewVisited && (
                            <MeetingReviewPanel groupId={groupId} />
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
}
