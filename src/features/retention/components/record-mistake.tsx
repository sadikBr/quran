"use client";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addMemorizationMistake } from "../server/actions";
import MistakeEditor from "./mistake-editor";

export default function RecordMistake({
    surahNumber,
    ayahNumber,
    label,
    riwayah,
}: {
    surahNumber: number;
    ayahNumber: number;
    label: string;
    riwayah: "hafs" | "warsh";
}) {
    const t = useTranslations("Memorization.retention");
    const [open, setOpen] = useState(false);
    const event = useRef<string | null>(null);
    return (
        <div className="mt-3">
            <Button
                type="button"
                variant="ghost"
                className="min-h-11 rounded-xl text-xs"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <NotebookPen className="size-4" aria-hidden="true" />
                {t(open ? "close" : "recordMistake")}
            </Button>
            {open && (
                <div className="mt-2 rounded-2xl border bg-background/70 p-4">
                    <MistakeEditor
                        references={[{ surahNumber, ayahNumber, label }]}
                        onAdd={async (input) => {
                            event.current ??= crypto.randomUUID();
                            try {
                                const result = await addMemorizationMistake({
                                    ...input,
                                    riwayah,
                                    eventId: event.current,
                                });
                                if (!result.success) {
                                    toast.error(t("saveError"));
                                    return false;
                                }
                                event.current = null;
                                setOpen(false);
                                toast.success(t("saved"));
                                return true;
                            } catch {
                                toast.error(t("saveError"));
                                return false;
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
