import PageBackground from "@/components/page-background";

export default function MemorizationLoading() {
    return (
        <main className="relative isolate min-h-dvh overflow-hidden bg-background">
            <PageBackground />
            <div className="app-container animate-pulse py-10 sm:py-14">
                <div className="h-4 w-28 rounded-full bg-muted" />
                <div className="mt-10 h-4 w-24 rounded-full bg-primary/10" />
                <div className="mt-4 h-10 max-w-xl rounded-xl bg-muted" />
                <div className="mt-4 h-6 max-w-2xl rounded-lg bg-muted/70" />
                <div className="mt-10 h-72 rounded-2xl bg-primary/[0.07] ring-1 ring-primary/10" />
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 15 }, (_, index) => (
                        <div
                            key={`memorization-loading-${index + 1}`}
                            className="h-28 rounded-2xl bg-muted/50"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
