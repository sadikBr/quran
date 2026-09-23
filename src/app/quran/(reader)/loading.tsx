export default function QuranReaderLoading() {
    return (
        <div
            aria-busy="true"
            aria-live="polite"
            className="flex h-full min-h-0 flex-col"
        >
            <p className="sr-only">Loading Quran content</p>
            <div className="flex-1 overflow-hidden">
                <div className="mx-auto max-w-5xl animate-pulse space-y-7 p-4">
                    <div className="mx-auto h-7 w-44 rounded bg-muted" />
                    <section className="space-y-5 rounded-xl border border-primary/10 bg-card/50 p-5 sm:p-6">
                        <div className="ml-auto h-5 w-28 rounded bg-muted" />
                        <div className="space-y-4" dir="rtl">
                            <div className="ml-auto h-8 w-full rounded bg-muted" />
                            <div className="ml-auto h-8 w-11/12 rounded bg-muted" />
                            <div className="ml-auto h-8 w-4/5 rounded bg-muted" />
                        </div>
                    </section>
                    <section className="space-y-5 rounded-xl border border-primary/10 bg-card/50 p-5 sm:p-6">
                        <div className="ml-auto h-5 w-24 rounded bg-muted" />
                        <div className="space-y-4" dir="rtl">
                            <div className="ml-auto h-8 w-10/12 rounded bg-muted" />
                            <div className="ml-auto h-8 w-full rounded bg-muted" />
                            <div className="ml-auto h-8 w-3/4 rounded bg-muted" />
                        </div>
                    </section>
                </div>
            </div>
            <div className="shrink-0 border-t border-primary/15 bg-background/95">
                <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-4 sm:h-20">
                    <div className="h-9 w-24 rounded-md bg-muted" />
                    <div className="h-10 w-32 rounded-lg bg-muted" />
                    <div className="h-9 w-20 rounded-md bg-muted" />
                </div>
            </div>
        </div>
    );
}
