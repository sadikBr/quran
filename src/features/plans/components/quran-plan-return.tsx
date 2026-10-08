"use client";

import { useSearchParams } from "next/navigation";
import TodayReturnLink from "./today-return-link";

export default function QuranPlanReturn() {
    const searchParams = useSearchParams();
    if (searchParams.get("from") !== "today") return null;
    return (
        <div className="border-b border-border/45 bg-background">
            <div className="app-container">
                <TodayReturnLink />
            </div>
        </div>
    );
}
