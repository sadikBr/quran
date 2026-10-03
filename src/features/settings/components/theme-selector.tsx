"use client";

import {
    Check,
    Citrus,
    Flower2,
    Gem,
    type LucideIcon,
    Monitor,
    Moon,
    PenTool,
    Snowflake,
    Sparkles,
    Sun,
    Waves,
    Wheat,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { THEMES, type Theme } from "../preferences";

const icons = {
    porcelain: Gem,
    seaglass: Waves,
    orchid: Flower2,
    inkstone: PenTool,
    glacier: Snowflake,
    saffron: Wheat,
    citron: Citrus,
    midnight: Moon,
    copper: Moon,
    celadon: Sun,
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
} satisfies Record<Theme, LucideIcon>;

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
                                    className={`theme-preview ${theme} relative flex h-20 overflow-hidden rounded-md border border-border bg-background p-2 sm:h-24`}
                                >
                                    <span className="w-1/4 rounded-sm bg-sidebar" />
                                    <span className="ms-2 flex-1 space-y-2 pt-1">
                                        <span className="block h-2 w-2/3 rounded-sm bg-primary" />
                                        <span className="block h-2 rounded-sm bg-muted-foreground/40" />
                                        <span className="block h-6 rounded-sm border border-border bg-card shadow-xs" />
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
