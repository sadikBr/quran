import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <section className="flex max-w-md flex-col items-center gap-5 text-center">
                <p className="text-7xl font-semibold tracking-[0.2em] text-primary">
                    404
                </p>
                <div className="space-y-2">
                    <h1 className="text-3xl font-semibold">Page not found</h1>
                    <p className="text-muted-foreground">
                        The page you are looking for does not exist or may have
                        moved. Choose a reading option below to continue.
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button asChild>
                        <Link href="/quran">Browse surahs</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/quran/page/1">Open page 1</Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
