"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export default function MinutesInput({
    value,
    min,
    onChange,
    ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "min" | "onChange"> & {
    value: number;
    min: number;
    onChange: (value: number) => void;
}) {
    const [text, setText] = useState(String(value));
    useEffect(() => setText(String(value)), [value]);
    return (
        <Input
            {...props}
            type="number"
            min={min}
            max={480}
            step={5}
            value={text}
            onChange={(event) => {
                const next = event.target.value;
                setText(next);
                const parsed = Number(next);
                if (
                    next !== "" &&
                    Number.isInteger(parsed) &&
                    parsed >= min &&
                    parsed <= 480
                )
                    onChange(parsed);
            }}
            onBlur={() => {
                const parsed = Math.round(Number(text));
                const next = Number.isFinite(parsed)
                    ? Math.min(480, Math.max(min, parsed))
                    : value;
                setText(String(next));
                onChange(next);
            }}
        />
    );
}
