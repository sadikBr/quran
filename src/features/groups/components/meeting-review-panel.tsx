"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import loadMeetingReview from "../server/load-meeting-review";
import AssignmentReview from "./assignment-review";

export default function MeetingReviewPanel({
    groupId,
    occurrence,
}: {
    groupId: string;
    occurrence: string;
}) {
    const t = useTranslations("Groups.review");
    const [data, setData] =
        useState<Awaited<ReturnType<typeof loadMeetingReview>>>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [paused, setPaused] = useState(false);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const flow = useTranslations("Groups.flow");
    const request = useRef(0);
    const load = useCallback(
        async (id?: string) => {
            const current = ++request.current;
            setLoading(true);
            setError(false);
            setPaused(false);
            try {
                const result = await loadMeetingReview(groupId, occurrence, id);
                if (current === request.current) setData(result);
            } catch {
                if (current === request.current) setError(true);
            } finally {
                if (current === request.current) setLoading(false);
            }
        },
        [groupId, occurrence],
    );
    useEffect(() => {
        void load();
        return () => {
            request.current++;
        };
    }, [load]);
    if (loading)
        return (
            <output className="flex justify-center p-10">
                <LoaderCircle
                    className="size-6 animate-spin"
                    aria-hidden="true"
                />
                <span className="sr-only">{t("loadingReview")}</span>
            </output>
        );
    if (error || !data)
        return (
            <div className="space-y-4 p-5 text-center">
                <p>
                    {t(
                        error
                            ? "meetingRequired"
                            : paused
                              ? "reviewPaused"
                              : "noAttendedMembers",
                    )}
                </p>
                <Button variant="outline" onClick={() => load()}>
                    {t("refreshQueue")}
                </Button>
            </div>
        );
    return (
        <div className="space-y-4">
            <ConfirmationDialog
                open={selected !== null}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
                title={t("chooseMember")}
                description={t("switchMemberConfirm")}
                confirmLabel={t("chooseMember")}
                cancelLabel={flow("cancel")}
                pending={busy}
                onConfirm={() => {
                    if (selected && !busy) {
                        const id = selected;
                        setSelected(null);
                        void load(id);
                    }
                }}
            />
            <label
                className="block text-sm font-medium"
                htmlFor="meeting-review-member"
            >
                {t("chooseMember")}
            </label>
            <select
                id="meeting-review-member"
                className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
                value={data.review.assignment.id}
                disabled={busy}
                onChange={(event) => {
                    setSelected(event.target.value);
                }}
            >
                {data.queue.map((item, index) => (
                    <option key={item.id} value={item.id}>
                        {item.name} · {index + 1}
                    </option>
                ))}
            </select>
            <AssignmentReview
                key={data.review.assignment.id}
                {...data}
                compact
                occurrence={occurrence}
                onBusyChange={setBusy}
                onStale={() => {
                    void load();
                }}
                onSaved={async (next) => {
                    if (next) await load(next);
                    else {
                        setPaused(true);
                        setData(null);
                    }
                }}
            />
        </div>
    );
}
