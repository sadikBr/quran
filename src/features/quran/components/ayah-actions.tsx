"use client";

import {
    ArrowLeft,
    Bookmark,
    BookOpenText,
    Copy,
    NotebookPen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const actions = [
    {
        icon: Bookmark,
        title: "Bookmark this ayah",
        description: "Save it to return to during a future reading session.",
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
    tafsirText,
    tafsirEditionName,
    tafsirDirection,
    closeOnCopy = false,
}: {
    surahName: string;
    ayahNumber: number;
    arabicText: string;
    tafsirText: string;
    tafsirEditionName: string;
    tafsirDirection: string;
    closeOnCopy?: boolean;
}) {
    const router = useRouter();
    const [isTafsirVisible, setIsTafsirVisible] = useState(false);

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

    if (isTafsirVisible) {
        return (
            <div className="pb-1">
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Ayah actions
                </button>
                <header className="mt-7 pr-9">
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        TAFSIR
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <h1
                            id="ayah-actions-title"
                            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                        >
                            {surahName}
                        </h1>
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                            Ayah {ayahNumber}
                        </span>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Selected edition</span>
                        <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                            {tafsirEditionName}
                        </span>
                    </div>
                </header>
                <article className="mt-8">
                    <p
                        dir={tafsirDirection}
                        className={`border-s-2 border-primary/60 py-1 pe-5 ps-5 text-card-foreground sm:pe-7 sm:ps-7 ${
                            tafsirDirection === "rtl"
                                ? "font-[family-name:var(--font-arabic)] text-xl leading-[2.15] sm:text-2xl sm:leading-[2.2]"
                                : "font-serif text-lg leading-9 sm:text-xl sm:leading-10"
                        }`}
                    >
                        {tafsirText}
                    </p>
                </article>
            </div>
        );
    }

    return (
        <div className="pb-1">
            <header className="border-b border-primary/15 pb-5 pr-8">
                <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">
                        AYAH ACTIONS
                    </p>
                </div>
                <h1
                    id="ayah-actions-title"
                    className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                >
                    {surahName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Ayah {ayahNumber}
                </p>
            </header>

            <p className="mt-6 text-sm leading-6 text-muted-foreground">
                Choose how you would like to continue with this ayah.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={copyArabicText}
                    className="group rounded-xl bg-primary p-5 text-left text-primary-foreground transition-transform hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                        <Copy aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-5 block">
                        <span className="font-medium">Copy Arabic text</span>
                        <span className="mt-1 block text-sm leading-5 text-primary-foreground/75">
                            Copy the text from your selected Quran edition.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setIsTafsirVisible(true)}
                    className="group rounded-xl border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <BookOpenText aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-5 block">
                        <span className="font-medium text-card-foreground">
                            Read tafsir
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            Explore commentary from your selected tafsir
                            edition.
                        </span>
                    </span>
                </button>
            </div>

            <section className="mt-8 border-t border-primary/15 pt-5">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
                    MORE TOOLS, COMING SOON
                </p>
                <div className="mt-3 divide-y border-y border-primary/10">
                    {actions.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="flex items-center gap-4 py-4"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Icon aria-hidden="true" className="size-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-card-foreground">
                                    {title}
                                </p>
                                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                                Soon
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
