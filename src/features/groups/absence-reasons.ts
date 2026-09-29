export const ABSENCE_REASONS = [
    {
        id: "health",
        en: "Illness or a medical appointment",
        ar: "مرض أو موعد طبي",
    },
    { id: "family", en: "Family circumstances", ar: "ظروف عائلية" },
    {
        id: "work",
        en: "Work or study commitments",
        ar: "التزامات العمل أو الدراسة",
    },
    { id: "travel", en: "Travel", ar: "سفر" },
    {
        id: "connection",
        en: "Internet or technical difficulties",
        ar: "مشكلة في الإنترنت أو الجهاز",
    },
    { id: "emergency", en: "An unexpected emergency", ar: "ظرف طارئ" },
] as const;

export type AbsenceReason = (typeof ABSENCE_REASONS)[number]["id"] | "custom";

// Keep the existing human-readable storage format, including older free-text
// explanations. Recognize both languages when editing after a locale change.
export function parseAbsenceReason(excuse: string | null): {
    reason: AbsenceReason | "";
    details: string;
} {
    if (!excuse) return { reason: "", details: "" };
    for (const reason of ABSENCE_REASONS) {
        for (const label of [reason.en, reason.ar]) {
            if (excuse === label) return { reason: reason.id, details: "" };
            if (excuse.startsWith(`${label}\n\n`))
                return {
                    reason: reason.id,
                    details: excuse.slice(label.length + 2),
                };
        }
    }
    return { reason: "custom", details: excuse };
}

export function formatAbsenceReason(
    reason: AbsenceReason | "",
    details: string,
    locale: string,
) {
    if (!reason) return "";
    if (reason === "custom") return details.trim();
    const option = ABSENCE_REASONS.find((item) => item.id === reason);
    if (!option) return "";
    const label = locale === "ar" ? option.ar : option.en;
    return details.trim() ? `${label}\n\n${details.trim()}` : label;
}
