"use client";

import { Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TAJWEED_RULES } from "./tajweed-text";

export default function TajweedLegend() {
    const t = useTranslations("Reader");
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-full bg-muted/55 px-3 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                    <Palette aria-hidden="true" className="size-3.5" />
                    <span className="hidden sm:inline">
                        {t("tajweed.button")}
                    </span>
                    <span className="sr-only sm:hidden">
                        {t("tajweed.button")}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[min(30rem,calc(100vw-2rem))] rounded-xl border-primary/10 bg-popover/98 p-4 shadow-xl backdrop-blur-md"
            >
                <DropdownMenuLabel className="p-0">
                    <span className="block text-sm font-semibold text-foreground">
                        {t("tajweed.title")}
                    </span>
                    <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                        {t("tajweed.description")}
                    </span>
                </DropdownMenuLabel>
                <div className="mt-4 grid max-h-[min(60dvh,28rem)] gap-x-5 gap-y-3 overflow-y-auto pe-1 sm:grid-cols-2">
                    {Object.entries(TAJWEED_RULES).map(
                        ([code, { className }]) => (
                            <div
                                key={code}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span
                                    aria-hidden="true"
                                    className={`size-2.5 shrink-0 rounded-full bg-current ring-4 ring-current/10 ${className}`}
                                />
                                <span className="leading-5 text-foreground/85">
                                    {t(`tajweed.rules.${code}`)}
                                </span>
                            </div>
                        ),
                    )}
                </div>
                <p className="mt-4 border-t border-primary/10 pt-3 text-[0.7rem] leading-5 text-muted-foreground">
                    {t("tajweed.paletteNote")}
                </p>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
