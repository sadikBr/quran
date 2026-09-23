import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function QuranHeader({
    startReadingHref,
    startReadingLabel = "Start reading",
    showSurahIndex,
}: {
    startReadingHref?: string;
    startReadingLabel?: string;
    showSurahIndex?: boolean;
}) {
    return (
        <header className="z-10 shrink-0 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
                <Link
                    href="/"
                    className="group flex min-w-0 items-center gap-3 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold tracking-wide text-foreground">
                            Quran Reader
                        </span>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                            Read and reflect
                        </span>
                    </span>
                </Link>
                <nav
                    aria-label="Quran navigation"
                    className="flex items-center gap-2"
                >
                    {showSurahIndex && (
                        <Button asChild size="sm" variant="ghost">
                            <Link href="/quran">Surah index</Link>
                        </Button>
                    )}
                    {startReadingHref && (
                        <Button asChild size="sm">
                            <Link href={startReadingHref}>
                                {startReadingLabel}
                            </Link>
                        </Button>
                    )}
                </nav>
            </div>
        </header>
    );
}
