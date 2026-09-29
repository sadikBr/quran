"use client";

import { Check, Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { THEMES, type Theme } from "../preferences";

const previews = {
    obsidian: "bg-linear-to-br from-[#141719] to-[#343d40]",
    lagoon: "bg-linear-to-br from-[#0e252d] to-[#284c56]",
    wisteria: "bg-linear-to-br from-[#f6f3fc] to-[#e1d7ef]",
    apricot: "bg-linear-to-br from-[#fff5ed] to-[#efd4c0]",
    system: "bg-linear-to-r from-[#faf7f2] from-50% to-[#211d19] to-50%",
    light: "bg-[#faf7f2]",
    dark: "bg-[#211d19]",
    emerald: "bg-[#10332d]",
    sapphire: "bg-[#101b30]",
    rose: "bg-[#faf5f3]",
    aurora: "bg-linear-to-br from-[#19152c] via-[#302747] to-[#224d49]",
    ruby: "bg-linear-to-br from-[#25151e] to-[#623947]",
    olive: "bg-linear-to-br from-[#f5f5e9] to-[#dce2cb]",
    pearl: "bg-linear-to-br from-[#faf6ed] to-[#e8ddc9]",
};
const icons = {
    obsidian: Sparkles,
    lagoon: Sparkles,
    wisteria: Sun,
    apricot: Sun,
    system: Monitor,
    light: Sun,
    dark: Moon,
    emerald: Sparkles,
    sapphire: Moon,
    rose: Sparkles,
    aurora: Sparkles,
    pearl: Sun,
    ruby: Sparkles,
    olive: Sun,
};

export default function ThemeSelector({
    value,
    onChange,
    disabled = false,
}: {
    value: Theme;
    onChange: (theme: Theme) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("Settings");
    const name = useId();

    return (
        <fieldset disabled={disabled} className="min-w-0">
            <legend className="sr-only">{t("theme.label")}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEMES.map((theme) => {
                    const Icon = icons[theme];
                    return (
                        <label
                            key={theme}
                            className="relative min-w-0 cursor-pointer"
                        >
                            <input
                                type="radio"
                                name={name}
                                value={theme}
                                checked={value === theme}
                                onChange={() => onChange(theme)}
                                className="peer sr-only"
                            />
                            <span className="block h-full rounded-xl border bg-background/60 p-2 transition-colors hover:bg-muted/50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 sm:p-3">
                                <span
                                    aria-hidden="true"
                                    className={`relative flex h-20 overflow-hidden rounded-md border border-black/10 p-2 sm:h-24 ${previews[theme]}`}
                                >
                                    <span
                                        className={`w-1/4 rounded-sm ${theme === "obsidian" ? "bg-[#343d40]" : theme === "lagoon" ? "bg-[#284c56]" : theme === "wisteria" ? "bg-[#e1d7ef]" : theme === "apricot" ? "bg-[#efd4c0]" : theme === "ruby" ? "bg-[#50303e]" : theme === "olive" ? "bg-[#dce2cb]" : theme === "aurora" ? "bg-[#3b3054]" : theme === "pearl" ? "bg-[#e4d8c0]" : theme === "rose" ? "bg-[#e9d5db]" : theme === "sapphire" ? "bg-[#2b4165]" : theme === "emerald" ? "bg-[#28574b]" : "bg-stone-500/20"}`}
                                    />
                                    <span className="ms-2 flex-1 space-y-2 pt-1">
                                        <span
                                            className={`block h-2 w-2/3 rounded-sm ${theme === "obsidian" ? "bg-[#e6ca83]" : theme === "lagoon" ? "bg-[#83dfec]" : theme === "wisteria" ? "bg-[#70509b]" : theme === "apricot" ? "bg-[#a34f30]" : theme === "ruby" ? "bg-[#efb29b]" : theme === "olive" ? "bg-[#526536]" : theme === "aurora" ? "bg-[#99dfce]" : theme === "pearl" ? "bg-[#7e592c]" : theme === "rose" ? "bg-[#934b65]" : theme === "sapphire" ? "bg-[#e2c78d]" : theme === "emerald" ? "bg-[#d8b766]" : "bg-orange-500/70"}`}
                                        />
                                        <span
                                            className={`block h-2 rounded-sm ${theme === "obsidian" ? "bg-[#b7c1c1]/40" : theme === "lagoon" ? "bg-[#aecbd0]/40" : theme === "wisteria" ? "bg-[#6c607c]/40" : theme === "apricot" ? "bg-[#795f50]/40" : theme === "ruby" ? "bg-[#cdb2bd]/40" : theme === "olive" ? "bg-[#65705a]/40" : theme === "aurora" ? "bg-[#bfb3d2]/40" : theme === "pearl" ? "bg-[#726752]/40" : theme === "rose" ? "bg-[#77606c]/40" : theme === "sapphire" ? "bg-[#aebcd2]/40" : theme === "emerald" ? "bg-[#b5c8bb]/40" : "bg-stone-500/25"}`}
                                        />
                                        <span
                                            className={`block h-6 rounded-sm border ${theme === "obsidian" ? "border-[#4c5658] bg-[#22282b]" : theme === "lagoon" ? "border-[#406572] bg-[#193740]" : theme === "wisteria" ? "border-[#cbbdda] bg-[#ece5f7]" : theme === "apricot" ? "border-[#d9b9a3] bg-[#fae7d9]" : theme === "ruby" ? "border-[#684653] bg-[#36212c]" : theme === "olive" ? "border-[#c4cdb4] bg-[#eaf0df]" : theme === "aurora" ? "border-[#544663] bg-[#29223e]" : theme === "pearl" ? "border-[#cec0a4] bg-[#f0e7d6]" : theme === "rose" ? "border-[#d9bec8] bg-[#f3e7e6]" : theme === "sapphire" ? "border-[#3b506d] bg-[#1b2b46]" : theme === "emerald" ? "border-[#416356] bg-[#1a463e]" : "border-stone-500/20 bg-stone-500/10"}`}
                                        />
                                    </span>
                                    {value === theme && (
                                        <span className="absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            <Check className="size-3" />
                                        </span>
                                    )}
                                </span>
                                <span className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium sm:text-sm">
                                    <Icon
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    {t(`theme.${theme}`)}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
