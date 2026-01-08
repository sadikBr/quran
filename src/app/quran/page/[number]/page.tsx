import QuranPage from "@/components/quran-renderer/quran-page";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Quran({
    params,
}: {
    params: Promise<{ number: number }>;
}) {
    const { number } = await params;

    return (
        <div className="flex flex-col h-screen">
            <QuranPage page={number} />

            <div className="flex justify-between items-center p-4 border-t">
                <Button variant="outline" disabled={number <= 1}>
                    <Link href={`/quran/page/${Number(number) - 1}`}>
                        Previous
                    </Link>
                </Button>
                <span className="text-sm font-medium">Page {number}</span>
                <Button variant="outline" disabled={number >= 604}>
                    <Link href={`/quran/page/${Number(number) + 1}`}>Next</Link>
                </Button>
            </div>
        </div>
    );
}
