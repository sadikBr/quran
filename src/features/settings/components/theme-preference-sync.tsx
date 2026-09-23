"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSettings } from "../settings-provider";

export default function ThemePreferenceSync() {
    const { theme } = useSettings();
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme(theme);
    }, [setTheme, theme]);

    return null;
}
