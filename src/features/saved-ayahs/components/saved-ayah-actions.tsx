"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AyahActions from "@/features/quran/components/ayah-actions";
import AyahActionsModal from "@/features/quran/components/ayah-actions-modal";
import getAyahActionsData, {
    type AyahActionsData,
} from "@/features/quran/server/get-ayah-actions-data";
import type { SavedAyah } from "../types";

export default function SavedAyahActions({
    ayah,
    onCloseAction,
}: {
    ayah: SavedAyah;
    onCloseAction: () => void;
}) {
    const router = useRouter();
    const t = useTranslations("Dashboard");
    const commonT = useTranslations("Common");
    const [data, setData] = useState<AyahActionsData | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    const loadActions = useCallback(() => {
        let cancelled = false;

        setData(null);
        setLoadFailed(false);

        getAyahActionsData(ayah.surahNumber, ayah.ayahNumber)
            .then((result) => {
                if (cancelled) return;
                if (result) setData(result);
                else setLoadFailed(true);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [ayah.ayahNumber, ayah.surahNumber]);

    useEffect(() => {
        return loadActions();
    }, [loadActions]);

    return (
        <AyahActionsModal onCloseAction={onCloseAction}>
            {data ? (
                <AyahActions
                    {...data}
                    onSavedAyahChangeAction={() => router.refresh()}
                />
            ) : loadFailed ? (
                <div className="py-14 text-center">
                    <h2 className="font-semibold">
                        {t("modal.loadFailedTitle")}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t("modal.loadFailedDescription")}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-5"
                        onClick={loadActions}
                    >
                        {commonT("error.retry")}
                    </Button>
                </div>
            ) : (
                <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
                    <LoaderCircle
                        aria-hidden="true"
                        className="size-5 animate-spin text-primary"
                    />
                    <p className="text-sm">{t("modal.loading")}</p>
                </div>
            )}
        </AyahActionsModal>
    );
}
