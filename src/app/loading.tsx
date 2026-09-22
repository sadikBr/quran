import { BookOpen } from "lucide-react";

export default function Loading() {
    return (
        <main
            aria-busy="true"
            aria-live="polite"
            className="flex min-h-dvh items-center justify-center bg-background p-6"
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <BookOpen aria-hidden="true" className="size-6" />
                </span>
                <div className="space-y-1">
                    <p className="font-semibold tracking-wide">Quran Reader</p>
                    <p className="text-sm text-muted-foreground">
                        Loading your page…
                    </p>
                </div>
                <span
                    aria-hidden="true"
                    className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                />
                <p className="sr-only">Loading</p>
            </div>
        </main>
    );
}
