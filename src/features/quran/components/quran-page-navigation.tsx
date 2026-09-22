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
                <Button
                    variant="outline"
                    disabled={page <= QuranInfo.minPageNumber}
                >
                    {page <= QuranInfo.minPageNumber ? (
                        "Previous"
                    ) : (
                        <Link href={`/quran/page/${Number(page) - 1}`}>
                            Previous
                        </Link>
                    )}
                </Button>
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
                <Button
                    variant="outline"
                    disabled={page >= QuranInfo.maxPageNumber}
                >
                    {page >= QuranInfo.maxPageNumber ? (
                        "Next"
                    ) : (
                        <Link href={`/quran/page/${Number(page) + 1}`}>
                            Next
                        </Link>
                    )}
                </Button>
            </div>
        </div>
    );
}
