"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuranInfo from "@/lib/quran-info";

export default function QuranPageNavigation({ page }: { page: number }) {
    const [currentPage, setCurrentPage] = useState<string>(page.toString());
    const router = useRouter();

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.push(`/quran/page/${currentPage}`);
    }

    return (
        <div className="border-t">
            <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
                {page <= QuranInfo.minPageNumber ? (
                    <Button disabled variant="outline">
                        Previous
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link href={`/quran/page/${Number(page) - 1}`}>
                            Previous
                        </Link>
                    </Button>
                )}
                <form onSubmit={submitForm}>
                    <Input
                        type="number"
                        required
                        value={currentPage}
                        onChange={(e) => setCurrentPage(e.target.value)}
                        min={QuranInfo.minPageNumber}
                        step={1}
                        max={QuranInfo.maxPageNumber}
                        className="w-18"
                    />
                </form>
                {page >= QuranInfo.maxPageNumber ? (
                    <Button disabled variant="outline">
                        Next
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link href={`/quran/page/${Number(page) + 1}`}>
                            Next
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
