"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function ReviewMethodLabel({
    method,
    reviewerName,
    className,
}: {
    method?: "self" | "peer" | null;
    reviewerName?: string | null;
    className?: string;
}) {
    const t = useTranslations("Groups.review");
    if (!method) return null;
    return (
        <p className={cn("mt-2 text-xs font-medium text-primary", className)}>
            {method === "peer" && reviewerName
                ? t.rich("reviewedBy", {
                      name: reviewerName,
                      reviewer: (name) => <bdi>{name}</bdi>,
                  })
                : t(method === "self" ? "selfReviewed" : "peerReviewed")}
        </p>
    );
}
