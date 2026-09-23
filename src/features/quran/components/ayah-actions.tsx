"use client";

import { Bookmark, BookOpenText, Copy, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const actions = [
    {
        icon: Bookmark,
        title: "Bookmark this ayah",
        description: "Save it to return to during a future reading session.",
    },
    {
        icon: BookOpenText,
        title: "Read tafsir",
        description: "Explore context and commentary for this ayah.",
    },
    {
        icon: NotebookPen,
        title: "Add a reflection",
        description: "Keep a personal note alongside your reading.",
    },
];

export default function AyahActions({
    surahName,
    ayahNumber,
    arabicText,
    closeOnCopy = false,
}: {
    surahName: string;
    ayahNumber: number;
    arabicText: string;
    closeOnCopy?: boolean;
}) {
    const router = useRouter();

    async function copyArabicText() {
        try {
            await navigator.clipboard.writeText(arabicText);
            toast.success("Arabic text copied");

            if (closeOnCopy) {
                router.back();
            }
        } catch {
            toast.error("Unable to copy the Arabic text");
        }
    }

    return (
        <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                AYAH ACTIONS
            </p>
            <h1
                id="ayah-actions-title"
                className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
            >
                {surahName}, ayah {ayahNumber}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Keep the actions you need close to the verse you are reading.
            </p>

            <div className="mt-6 divide-y rounded-xl border bg-card">
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="flex w-full gap-4 p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span>
                        <span className="font-medium text-card-foreground">
                            Copy Arabic text
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Copy this ayah using your selected Quran edition.
                        </span>
                    </span>
                </button>
                {actions.map(({ icon: Icon, title, description }) => (
                    <div key={title} className="flex gap-4 p-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div>
                            <p className="font-medium text-card-foreground">
                                {title}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                {description}
                            </p>
                            <span className="mt-2 inline-block text-xs font-medium text-primary">
                                Coming soon
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
