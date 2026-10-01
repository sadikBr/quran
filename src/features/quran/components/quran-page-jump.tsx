"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuranPageJump({ maxPage }: { maxPage: number }) {
    const t = useTranslations("Reader.index");
    const router = useRouter();
    const [page, setPage] = useState("");

    return (
        <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                const number = Number(page);
                if (
                    Number.isInteger(number) &&
                    number >= 1 &&
                    number <= maxPage
                ) {
                    router.push(`/quran/page/${number}`);
                }
            }}
        >
            <label htmlFor="index-page-number" className="text-sm font-medium">
                {t("goToPage")}
            </label>
            <Input
                id="index-page-number"
                type="number"
                inputMode="numeric"
                min={1}
                max={maxPage}
                step={1}
                required
                value={page}
                onChange={(event) => setPage(event.target.value)}
                placeholder={`1–${maxPage}`}
                aria-label={t("pageNumber", { max: maxPage })}
                className="h-11 w-28 rounded-xl bg-background text-start tabular-nums"
            />
            <Button
                type="submit"
                variant="outline"
                className="min-h-11 rounded-xl"
            >
                {t("openPage")}
                <ArrowRight
                    aria-hidden="true"
                    className="size-4 rtl:rotate-180"
                />
            </Button>
        </form>
    );
}
