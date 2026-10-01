"use client";

import { useLocale } from "next-intl";
import {
    Combobox,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxInput,
    ComboboxItem,
    ComboboxLabel,
    ComboboxList,
    ComboboxSeparator,
} from "@/components/ui/combobox";
import type { Edition } from "../types";

interface EditionComboboxProps {
    id?: string;
    ariaLabel?: string;
    editions: Edition[];
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder: string;
    emptyMessage?: string;
    groupBy?: (edition: Edition) => string;
    getBadge?: (edition: Edition) => string | undefined;
    getLabel?: (edition: Edition) => string;
    className?: string;
}

export default function EditionCombobox({
    id,
    ariaLabel,
    editions,
    value,
    onValueChange,
    disabled = false,
    placeholder,
    emptyMessage = "No matching editions found.",
    groupBy,
    getBadge,
    getLabel: getCustomLabel,
    className,
}: EditionComboboxProps) {
    const locale = useLocale();
    const groupedEditions = new Map<string, Edition[]>();

    for (const edition of editions) {
        const group = groupBy?.(edition) ?? "";
        groupedEditions.set(group, [
            ...(groupedEditions.get(group) ?? []),
            edition,
        ]);
    }

    const groups = [...groupedEditions.entries()].map(([label, items]) => ({
        label,
        items,
    }));
    const selectedEdition =
        editions.find((edition) => edition.identifier === value) ?? null;

    function getLabel(edition: Edition) {
        if (getCustomLabel) return getCustomLabel(edition);

        return locale === "ar"
            ? edition.name || edition.englishName
            : edition.englishName || edition.name;
    }

    return (
        <Combobox
            items={groups}
            value={selectedEdition}
            onValueChange={(edition) => {
                if (edition) onValueChange(edition.identifier);
            }}
            itemToStringLabel={getLabel}
            itemToStringValue={(edition) => edition.identifier}
            isItemEqualToValue={(edition, selectedValue) =>
                edition.identifier === selectedValue.identifier
            }
            disabled={disabled}
            autoHighlight
        >
            <ComboboxInput
                id={id}
                aria-label={ariaLabel}
                placeholder={placeholder}
                className={className}
            />
            <ComboboxContent
                dir={locale === "ar" ? "rtl" : "ltr"}
                className="w-(--anchor-width) min-w-0 rounded-xl bg-popover p-1 shadow-lg ring-border/60"
            >
                <ComboboxEmpty className="px-4 py-8">
                    {emptyMessage}
                </ComboboxEmpty>
                <ComboboxList className="max-h-[min(20rem,calc(var(--available-height)-1rem))] p-1">
                    {(
                        group: { label: string; items: Edition[] },
                        groupIndex,
                    ) => (
                        <div key={group.label || "editions"}>
                            {groupIndex > 0 && <ComboboxSeparator />}
                            <ComboboxGroup items={group.items}>
                                {group.label && (
                                    <ComboboxLabel className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                                        {group.label}
                                    </ComboboxLabel>
                                )}
                                <ComboboxCollection>
                                    {(edition: Edition) => {
                                        const badge = getBadge?.(edition);

                                        return (
                                            <ComboboxItem
                                                key={edition.identifier}
                                                value={edition}
                                                className="min-h-10 rounded-lg px-3 py-2 pe-9 data-highlighted:bg-primary/8"
                                            >
                                                <span className="min-w-0 flex-1 leading-5">
                                                    {getLabel(edition)}
                                                </span>
                                                {badge && (
                                                    <span className="me-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-primary uppercase">
                                                        {badge}
                                                    </span>
                                                )}
                                            </ComboboxItem>
                                        );
                                    }}
                                </ComboboxCollection>
                            </ComboboxGroup>
                        </div>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
