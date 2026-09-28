"use client";

import { CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import reviewMemberAssignment from "../server/review-member-assignment";

export default function ReviewDecisionForm({
    groupId,
    assignmentId,
}: {
    groupId: string;
    assignmentId: string;
}) {
    const t = useTranslations("Groups.review");
    const router = useRouter();
    const [note, setNote] = useState("");
    const [pendingDecision, setPendingDecision] = useState<
        "completed" | "needs_revision" | null
    >(null);

    async function decide(decision: "completed" | "needs_revision") {
        setPendingDecision(decision);
        const result = await reviewMemberAssignment({
            groupId,
            assignmentId,
            decision,
            note,
        });
        setPendingDecision(null);

        if (!result.success) {
            toast.error(t("error"));
            return;
        }

        toast.success(
            t(
                decision === "completed"
                    ? "completedSuccess"
                    : "revisionSuccess",
            ),
        );
        router.push(`/groups/${groupId}`);
        router.refresh();
    }

    return (
        <section className="rounded-3xl bg-primary/[0.07] p-5 ring-1 ring-primary/15 sm:p-7">
            <h2 className="text-xl font-semibold">{t("decisionTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("decisionDescription")}
            </p>
            <div className="mt-6">
                <Label htmlFor="review-note">{t("note")}</Label>
                <Textarea
                    id="review-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    placeholder={t("notePlaceholder")}
                    className="mt-2 min-h-28 rounded-xl bg-background/70"
                />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={pendingDecision !== null}
                    onClick={() => decide("needs_revision")}
                    className="min-h-12 rounded-xl border-primary/25"
                >
                    {pendingDecision === "needs_revision" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <RotateCcw className="size-4" />
                    )}
                    {t("needsRevision")}
                </Button>
                <Button
                    type="button"
                    disabled={pendingDecision !== null}
                    onClick={() => decide("completed")}
                    className="min-h-12 rounded-xl"
                >
                    {pendingDecision === "completed" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <CheckCircle2 className="size-4" />
                    )}
                    {t("complete")}
                </Button>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {t("revisionHint")}
            </p>
        </section>
    );
}
