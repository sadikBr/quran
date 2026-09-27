"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import completeDailyWird from "../server/complete-daily-wird";

export default function CompleteWirdButton() {
    const router = useRouter();
    const t = useTranslations("Wird.today");
    const [isCompleting, setIsCompleting] = useState(false);

    async function complete() {
        setIsCompleting(true);
        const result = await completeDailyWird();
        setIsCompleting(false);

        if (!result.success) {
            toast.error(t("completeError"));
            return;
        }

        toast.success(t("completeSuccess"));
        router.refresh();
    }

    return (
        <Button
            type="button"
            variant="outline"
            disabled={isCompleting}
            onClick={complete}
            className="gap-2"
        >
            <Check aria-hidden="true" className="size-4" />
            {isCompleting ? t("completing") : t("markComplete")}
        </Button>
    );
}
