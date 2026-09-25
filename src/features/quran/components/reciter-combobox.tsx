"use client";

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
import type { Reciter } from "../types";

interface ReciterComboboxProps {
    id?: string;
    ariaLabel?: string;
    reciters: Reciter[];
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder: string;
    groupBy?: (reciter: Reciter) => string;
    getBadge?: (reciter: Reciter) => string | undefined;
    className?: string;
}

export default function ReciterCombobox({
    id,
    ariaLabel,
    reciters,
    value,
    onValueChange,
    disabled = false,
    placeholder,
    groupBy,
    getBadge,
    className,
}: ReciterComboboxProps) {
    const groupedReciters = new Map<string, Reciter[]>();

    for (const reciter of reciters) {
        const group = groupBy?.(reciter) ?? "";
        groupedReciters.set(group, [
            ...(groupedReciters.get(group) ?? []),
            reciter,
        ]);
    }

    const groups = [...groupedReciters.entries()].map(([label, items]) => ({
        label,
        items,
    }));
    const selectedReciter =
        reciters.find((reciter) => reciter.id === value) ?? null;

    function getLabel(reciter: Reciter) {
        return reciter.name;
    }

    return (
        <Combobox
            items={groups}
            value={selectedReciter}
            onValueChange={(reciter) => {
                if (reciter) onValueChange(reciter.id);
            }}
            itemToStringLabel={getLabel}
            itemToStringValue={(reciter) => reciter.id}
            isItemEqualToValue={(reciter, selectedValue) =>
                reciter.id === selectedValue.id
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
            <ComboboxContent className="w-[min(28rem,calc(100vw-2rem))] min-w-0 rounded-xl bg-popover/98 p-1 shadow-xl ring-primary/10 backdrop-blur-md">
                <ComboboxEmpty className="px-4 py-8">
                    No matching reciters found.
                </ComboboxEmpty>
                <ComboboxList className="max-h-80 p-1">
                    {(
                        group: { label: string; items: Reciter[] },
                        groupIndex,
                    ) => (
                        <div key={group.label || "reciters"}>
                            {groupIndex > 0 && <ComboboxSeparator />}
                            <ComboboxGroup items={group.items}>
                                {group.label && (
                                    <ComboboxLabel className="px-3 pt-3 pb-1 text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                                        {group.label}
                                    </ComboboxLabel>
                                )}
                                <ComboboxCollection>
                                    {(reciter: Reciter) => {
                                        const badge = getBadge?.(reciter);

                                        return (
                                            <ComboboxItem
                                                key={reciter.id}
                                                value={reciter}
                                                className="min-h-10 rounded-lg px-3 py-2 pr-9 data-highlighted:bg-primary/8"
                                            >
                                                <span className="min-w-0 flex-1 leading-5">
                                                    {getLabel(reciter)}
                                                </span>
                                                {badge && (
                                                    <span className="mr-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-primary uppercase">
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
