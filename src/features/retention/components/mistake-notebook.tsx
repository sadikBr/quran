"use client";
import { CheckCheck, NotebookPen, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
    addMemorizationMistake,
    updateMemorizationMistake,
} from "../server/actions";
import type { MistakeView } from "../types";
import MistakeEditor, { fieldClass } from "./mistake-editor";

type Surah = {
    number: number;
    name: string;
    englishName: string;
    hafs: number;
    warsh: number;
};
export default function MistakeNotebook({
    items,
    surahs,
    defaultRiwayah,
}: {
    items: MistakeView[];
    surahs: Surah[];
    defaultRiwayah: "hafs" | "warsh";
}) {
    const t = useTranslations("Memorization.retention"),
        locale = useLocale(),
        router = useRouter();
    const [riwayah, setRiwayah] = useState(defaultRiwayah);
    const [resolved, setResolved] = useState(false);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(20);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const pending = useRef(false),
        request = useRef<string | null>(null);
    const references = useMemo(
        () =>
            surahs.flatMap((s) =>
                Array.from({ length: s[riwayah] }, (_, i) => ({
                    surahNumber: s.number,
                    ayahNumber: i + 1,
                    label: locale === "ar" ? s.name : s.englishName,
                })),
            ),
        [surahs, riwayah, locale],
    );
    const name = (n: number) => {
        const s = surahs[n - 1];
        return locale === "ar" ? s?.name : s?.englishName;
    };
    const visible = items.filter(
        (m) =>
            m.riwayah === riwayah &&
            Boolean(m.resolvedAt) === resolved &&
            `${name(m.surahNumber)} ${m.surahNumber}:${m.ayahNumber} ${m.note} ${t(`kinds.${m.kind}`)}`
                .toLocaleLowerCase(locale)
                .includes(search.trim().toLocaleLowerCase(locale)),
    );
    async function change(item: MistakeView) {
        if (pending.current) return;
        pending.current = true;
        setBusy(item.id);
        try {
            const result = await updateMemorizationMistake({
                id: item.id,
                revision: item.revision,
                action: resolved ? "reopened" : "resolved",
                eventId: crypto.randomUUID(),
            });
            if (!result.success)
                toast.error(
                    t(result.reason === "stale" ? "stale" : "saveError"),
                );
            else toast.success(t("saved"));
            router.refresh();
        } catch {
            toast.error(t("saveError"));
        } finally {
            pending.current = false;
            setBusy(null);
        }
    }
    return (
        <div className="space-y-6">
            <PageHeading
                title={t("notebook")}
                description={t("notebookDescription")}
                icon={<NotebookPen />}
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="text-sm" htmlFor="mistake-search">
                    {t("search")}
                    <input
                        id="mistake-search"
                        type="search"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setLimit(20);
                        }}
                        className={fieldClass}
                    />
                </label>
                <label className="text-sm" htmlFor="mistake-reading">
                    {t("reading")}
                    <select
                        id="mistake-reading"
                        value={riwayah}
                        onChange={(e) => {
                            setRiwayah(e.target.value as typeof riwayah);
                            setLimit(20);
                        }}
                        className={fieldClass}
                    >
                        <option value="hafs">{t("hafs")}</option>
                        <option value="warsh">{t("warsh")}</option>
                    </select>
                </label>
                <Button
                    type="button"
                    className="min-h-11 rounded-xl"
                    onClick={() => setAdding(!adding)}
                    aria-expanded={adding}
                >
                    {t(adding ? "close" : "addMistake")}
                </Button>
            </div>
            {adding && (
                <section className="app-card max-w-2xl p-5">
                    <MistakeEditor
                        key={riwayah}
                        references={references}
                        onAdd={async (input) => {
                            request.current ??= crypto.randomUUID();
                            try {
                                const result = await addMemorizationMistake({
                                    ...input,
                                    riwayah,
                                    eventId: request.current,
                                });
                                if (!result.success) {
                                    toast.error(t("saveError"));
                                    return false;
                                }
                                request.current = null;
                                setAdding(false);
                                setResolved(false);
                                toast.success(t("saved"));
                                router.refresh();
                                return true;
                            } catch {
                                toast.error(t("saveError"));
                                return false;
                            }
                        }}
                    />
                </section>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-xl border bg-card p-1">
                    {[false, true].map((value) => (
                        <Button
                            key={String(value)}
                            type="button"
                            variant={resolved === value ? "secondary" : "ghost"}
                            aria-pressed={resolved === value}
                            className="min-h-11 rounded-lg"
                            onClick={() => {
                                setResolved(value);
                                setLimit(20);
                            }}
                        >
                            {t(value ? "resolved" : "active")}
                        </Button>
                    ))}
                </div>
                <span className="text-sm text-muted-foreground">
                    {t("itemCount", { count: visible.length })}
                </span>
            </div>
            {!visible.length ? (
                <div className="app-card p-8 text-center">
                    <CheckCheck className="mx-auto mb-3 size-8 text-primary" />
                    <p className="font-semibold">
                        {t(resolved ? "noResolved" : "noMistakes")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("emptyNotebookHint")}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {visible.slice(0, limit).map((item) => (
                        <article
                            key={item.id}
                            className="app-card flex min-w-0 flex-col p-5 sm:p-6"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h2 className="font-semibold">
                                    {name(item.surahNumber)} ·{" "}
                                    {t("ayahNumber", {
                                        number: item.ayahNumber,
                                    })}
                                </h2>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                                    {t(`kinds.${item.kind}`)}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-6 text-muted-foreground">
                                <span>
                                    {t("occurrences", {
                                        count: item.occurrences,
                                    })}
                                </span>
                                <span>
                                    {t("practisedCount", {
                                        count: item.practiceCount,
                                    })}
                                </span>
                                {item.reviewer && (
                                    <span>{t("fromReviewer")}</span>
                                )}
                            </div>
                            {item.note && (
                                <p
                                    dir="auto"
                                    className="mt-3 whitespace-pre-wrap break-words text-sm leading-7"
                                >
                                    {item.note}
                                </p>
                            )}
                            {!item.memorized && (
                                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                    {t("notMemorized")}
                                </p>
                            )}
                            <div className="mt-auto flex flex-wrap gap-2 pt-5">
                                {!resolved && item.memorized && (
                                    <Button
                                        asChild
                                        className="min-h-11 rounded-xl"
                                    >
                                        <Link
                                            href={`/memorization/mistakes/${item.id}`}
                                        >
                                            {t("practise")}
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={busy !== null}
                                    className="min-h-11 rounded-xl whitespace-normal"
                                    onClick={() => change(item)}
                                >
                                    {resolved ? (
                                        <RotateCcw className="size-4" />
                                    ) : (
                                        <CheckCheck className="size-4" />
                                    )}
                                    {t(
                                        busy === item.id
                                            ? "saving"
                                            : resolved
                                              ? "reopen"
                                              : "resolve",
                                    )}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {visible.length > limit && (
                <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full rounded-xl"
                    onClick={() => setLimit(limit + 20)}
                >
                    {t("showMore")}
                </Button>
            )}
        </div>
    );
}
