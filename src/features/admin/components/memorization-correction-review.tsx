"use client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewMemorizationCorrection } from "@/features/memorization/server/record-actions";

export default function MemorizationCorrectionReview({
    requestId,
}: {
    requestId: string;
}) {
    const t = useTranslations("Memorization.admin");
    const router = useRouter();
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(false);
    async function review(decision: "approved" | "declined") {
        setPending(true);
        try {
            const result = await reviewMemorizationCorrection({
                requestId,
                decision,
                note,
            });
            if (!result.success) {
                toast.error(t("failed"));
                return;
            }
            toast.success(t("saved"));
            router.refresh();
        } catch {
            toast.error(t("failed"));
        } finally {
            setPending(false);
        }
    }
    return (
        <div className="mt-4 space-y-3">
            <label htmlFor={`review-${requestId}`} className="block text-sm">
                {t("note")}
            </label>
            <Textarea
                id={`review-${requestId}`}
                value={note}
                maxLength={1000}
                disabled={pending}
                onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
                <Button disabled={pending} onClick={() => review("approved")}>
                    {t("approve")}
                </Button>
                <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => review("declined")}
                >
                    {t("decline")}
                </Button>
            </div>
        </div>
    );
}
