"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import loadMeetingReview from "../server/load-meeting-review";
import AssignmentReview from "./assignment-review";

export default function MeetingReviewPanel({ groupId }: { groupId: string }) {
    const t = useTranslations("Groups.review");
    const [data, setData] =
        useState<Awaited<ReturnType<typeof loadMeetingReview>>>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [paused, setPaused] = useState(false);
    const request = useRef(0);
    const load = useCallback(
        async (id?: string) => {
            const current = ++request.current;
            setLoading(true);
            setError(false);
            setPaused(false);
            try {
                const result = await loadMeetingReview(groupId, id);
                if (current === request.current) setData(result);
            } catch {
                if (current === request.current) setError(true);
            } finally {
                if (current === request.current) setLoading(false);
            }
        },
        [groupId],
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
                            ? "loadError"
                            : paused
                              ? "reviewPaused"
                              : "queueComplete",
                    )}
                </p>
                <Button variant="outline" onClick={() => load()}>
                    {t("refreshQueue")}
                </Button>
            </div>
        );
    return (
        <AssignmentReview
            key={data.review.assignment.id}
            {...data}
            compact
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
    );
}
