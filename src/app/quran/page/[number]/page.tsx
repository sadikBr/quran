import Link from "next/link";
import { Button } from "@/components/ui/button";
import QuranPage from "@/features/quran/components/quran-page";

export default async function Quran({
    params,
}: {
    params: Promise<{ number: number }>;
}) {
    const { number } = await params;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <QuranPage page={number} />

            <div className="border-t">
                <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
                    <Button variant="outline" disabled={number <= 1}>
                        <Link href={`/quran/page/${Number(number) - 1}`}>
                            Previous
                        </Link>
                    </Button>
                    <span className="text-sm font-medium">Page {number}</span>
                    <Button variant="outline" disabled={number >= 604}>
                        <Link href={`/quran/page/${Number(number) + 1}`}>
                            Next
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
