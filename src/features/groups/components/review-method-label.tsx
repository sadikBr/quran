"use client";

import { useTranslations } from "next-intl";

export default function ReviewMethodLabel({
    method,
}: {
    method?: "self" | "peer" | null;
}) {
    const t = useTranslations("Groups.review");
    if (!method) return null;
    return (
        <p className="mt-2 text-xs font-medium text-primary">
            {t(method === "self" ? "selfReviewed" : "peerReviewed")}
        </p>
    );
}
