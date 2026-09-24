"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TAJWEED_RULES } from "./tajweed-text";

export default function TajweedLegend() {
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
                    <span className="hidden sm:inline">Tajweed colors</span>
                    <span className="sr-only sm:hidden">Tajweed colors</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[min(30rem,calc(100vw-2rem))] rounded-xl border-primary/10 bg-popover/98 p-4 shadow-xl backdrop-blur-md"
            >
                <DropdownMenuLabel className="p-0">
                    <span className="block text-sm font-semibold text-foreground">
                        Tajweed color guide
                    </span>
                    <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                        Each color highlights a pronunciation rule in the
                        selected Tajweed edition.
                    </span>
                </DropdownMenuLabel>
                <div className="mt-4 grid max-h-[min(60dvh,28rem)] gap-x-5 gap-y-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {Object.entries(TAJWEED_RULES).map(
                        ([code, { className, label }]) => (
                            <div
                                key={code}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span
                                    aria-hidden="true"
                                    className={`size-2.5 shrink-0 rounded-full bg-current ring-4 ring-current/10 ${className}`}
                                />
                                <span className="leading-5 text-foreground/85">
                                    {label}
                                </span>
                            </div>
                        ),
                    )}
                </div>
                <p className="mt-4 border-t border-primary/10 pt-3 text-[0.7rem] leading-5 text-muted-foreground">
                    Light mode follows Al Quran Cloud’s official palette. Dark
                    mode uses contrast-adjusted shades of the same colors.
                </p>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
