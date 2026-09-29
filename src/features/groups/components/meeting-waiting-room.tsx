"use client";

import { LoaderCircle, LogOut, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { Button } from "@/components/ui/button";

export default function MeetingWaitingRoom({
    groupId,
    hostName,
}: {
    groupId: string;
    hostName: string;
}) {
    const t = useTranslations("Groups.meeting.room");
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        async function checkHost() {
            const response = await fetch(
                `/api/groups/${groupId}/meeting/presence`,
                { cache: "no-store" },
            ).catch(() => null);
            if (!response?.ok || cancelled) return;

            const result = (await response.json()) as { hostPresent?: boolean };
            if (result.hostPresent) router.refresh();
        }

        void checkHost();
        const interval = window.setInterval(checkHost, 4_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [groupId, router]);

    return (
        <main className="flex min-h-dvh flex-col bg-background">
            <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 border-border/60 border-b bg-background px-3 pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] sm:px-4">
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
                        {t("waitingTitle")}
                    </h1>
                    <p className="mt-3 text-pretty leading-7 text-muted-foreground">
                        {t("waitingDescription", { name: hostName })}
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin text-primary" />
                        {t("checkingHost")}
                    </div>
                </div>
            </section>
        </main>
    );
}
