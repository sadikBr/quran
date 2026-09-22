import { getArabicNumber } from "@/lib/arabic-numbers";
import { cn } from "@/lib/utils";
import type { AyahType } from "../types";

export default function Ayah({ ayah }: { ayah: AyahType }) {
    return (
        <span className="ayah inline text-3xl leading-[inherit] text-foreground sm:text-4xl">
            <span
                className={cn(
                    ayah.sajda &&
                        "text-primary underline decoration-primary/40 decoration-2 underline-offset-8",
                )}
            >
                {ayah.text}
            </span>{" "}
            <span className="frame inline-block align-[0.08em] text-sidebar-accent">
                {getArabicNumber(ayah.numberInSurah)}
            </span>{" "}
        </span>
    );
}
