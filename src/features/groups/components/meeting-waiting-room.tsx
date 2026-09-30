"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { Button } from "@/components/ui/button";
import { presenceState, type WaitingPhase } from "../presence-state";

export default function MeetingWaitingRoom({
    groupId,
    hostName,
}: {
    groupId: string;
    hostName: string;
}) {
    const t = useTranslations("Groups.meeting.room");
    const flow = useTranslations("Groups.flow");
    const [phase, setPhase] = useState<WaitingPhase>("waitingHost");
    const [attempt, setAttempt] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (attempt > 0) setPhase("waitingHost");
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        let controller: AbortController | undefined;

        async function checkHost() {
            controller = new AbortController();
            const timeout = window.setTimeout(() => controller?.abort(), 8000);
            let terminal = false;
            try {
                const response = await fetch(
                    `/api/groups/${groupId}/meeting/presence`,
                    { cache: "no-store", signal: controller.signal },
                );
                if (cancelled) return;
                const result = response.ok ? await response.json() : undefined;
                if (cancelled) return;
                const next = presenceState(response.status, result);
                terminal = ["closed", "signedOut", "noAccess"].includes(next);
                setPhase(next === "admitted" ? "waitingHost" : next);
                if (next === "admitted") router.refresh();
            } catch {
                if (!cancelled) setPhase("connection");
            } finally {
                window.clearTimeout(timeout);
                if (!cancelled && !terminal)
                    timer = setTimeout(checkHost, 4000);
            }
        }

        void checkHost();
        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller?.abort();
        };
    }, [groupId, router, attempt]);

    return (
        <main className="flex min-h-dvh flex-col bg-background">
            <header className="shrink-0 border-b border-border/60 bg-background">
                <div className="app-container flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))]">
                    <AppPrimaryNav />
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-xl"
                    >
                        <Link href={`/groups/${groupId}`}>
                            <LogOut className="size-4" />
                            {t("leave")}
                        </Link>
                    </Button>
                    <AppLogo />
                </div>
            </header>
            <section className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                <div className="max-w-md">
                    <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <Video className="size-7" />
                    </span>
                    <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                        {t("waitingEyebrow")}
                    </p>
                    <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                        {phase === "waitingHost"
                            ? t("waitingTitle")
                            : flow(phase)}
                    </h1>
                    <p className="mt-3 text-pretty leading-7 text-muted-foreground">
                        {phase === "waitingHost" &&
                            t("waitingDescription", { name: hostName })}
                    </p>
                    {phase === "waitingHost" && (
                        <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle className="size-4 animate-spin text-primary" />
                            {t("checkingHost")}
                        </div>
                    )}
                    <div
                        className="mt-5 flex flex-wrap justify-center gap-2"
                        aria-live="polite"
                    >
                        {phase === "connection" && (
                            <Button
                                variant="outline"
                                onClick={() => setAttempt((value) => value + 1)}
                            >
                                {flow("retry")}
                            </Button>
                        )}
                        {phase === "signedOut" && (
                            <Button asChild>
                                <Link
                                    href={`/sign-in?returnTo=${encodeURIComponent(`/groups/${groupId}/meeting`)}`}
                                >
                                    {flow("signIn")}
                                </Link>
                            </Button>
                        )}
                        {phase !== "waitingHost" && (
                            <Button asChild variant="outline">
                                <Link href={`/groups/${groupId}`}>
                                    {flow("back")}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
