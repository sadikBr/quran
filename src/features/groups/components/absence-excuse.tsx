"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ABSENCE_REASONS,
    type AbsenceReason,
    formatAbsenceReason,
    parseAbsenceReason,
} from "../absence-reasons";
import saveAbsenceExcuse from "../server/save-absence-excuse";

export default function AbsenceExcuse({
    groupId,
    attendanceId,
    excuse,
    pending,
}: {
    groupId: string;
    attendanceId: string;
    excuse: string | null;
    pending: boolean;
}) {
    const t = useTranslations("Groups.meeting.history");
    const router = useRouter();
    const locale = useLocale();
    const [reason, setReason] = useState<AbsenceReason | "">(
        () => parseAbsenceReason(excuse).reason,
    );
    const [text, setText] = useState(() => parseAbsenceReason(excuse).details);
    const explanation = formatAbsenceReason(reason, text, locale);
    const detailsLimit =
        1000 -
        (reason && reason !== "custom"
            ? formatAbsenceReason(reason, "", locale).length + 2
            : 0);
    const [saving, setSaving] = useState(false);
    if (!pending)
        return excuse ? (
            <p className="whitespace-pre-wrap break-words text-sm">{excuse}</p>
        ) : null;
    return (
        <form
            className="space-y-3"
            onSubmit={async (event) => {
                event.preventDefault();
                if (saving || !explanation || explanation.length > 1000) return;
                setSaving(true);
                try {
                    const result = await saveAbsenceExcuse({
                        groupId,
                        attendanceId,
                        excuse: explanation,
                    });
                    toast[result.success ? "success" : "error"](
                        t(result.success ? "excuseSaved" : "excuseError"),
                    );
                    router.refresh();
                } catch {
                    toast.error(t("excuseError"));
                } finally {
                    setSaving(false);
                }
            }}
        >
            <label
                htmlFor={`absence-reason-${attendanceId}`}
                className="block space-y-2"
            >
                <span className="text-sm font-medium">
                    {t("explainAbsence")}
                </span>
                <select
                    id={`absence-reason-${attendanceId}`}
                    value={reason}
                    onChange={(event) =>
                        setReason(event.target.value as AbsenceReason)
                    }
                    required
                    disabled={saving}
                    className="h-11 w-full rounded-xl border bg-background px-3 text-start text-sm"
                >
                    <option value="" disabled>
                        {t("chooseReason")}
                    </option>
                    {ABSENCE_REASONS.map((option) => (
                        <option key={option.id} value={option.id}>
                            {locale === "ar" ? option.ar : option.en}
                        </option>
                    ))}
                    <option value="custom">{t("customReason")}</option>
                </select>
            </label>
            {reason && (
                <label
                    htmlFor={`excuse-${attendanceId}`}
                    className="block space-y-2"
                >
                    <span className="text-sm font-medium">
                        {t(
                            reason === "custom"
                                ? "customReasonDetails"
                                : "additionalDetails",
                        )}
                    </span>
                    <Textarea
                        id={`excuse-${attendanceId}`}
                        dir="auto"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        maxLength={detailsLimit}
                        required={reason === "custom"}
                        disabled={saving}
                    />
                </label>
            )}
            {explanation.length > 1000 && (
                <p className="text-sm text-destructive">{t("excuseTooLong")}</p>
            )}
            <p className="text-xs text-muted-foreground">
                {t("excusePrivacy")}
            </p>
            <Button
                size="sm"
                disabled={saving || !explanation || explanation.length > 1000}
            >
                {t(saving ? "excuseSaving" : "saveExcuse")}
            </Button>
        </form>
    );
}
