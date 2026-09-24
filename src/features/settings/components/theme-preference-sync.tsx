"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useSettings } from "../settings-provider";

export default function ThemePreferenceSync() {
    const { theme } = useSettings();
    const { setTheme } = useTheme();
    const setThemeRef = useRef(setTheme);

    useEffect(() => {
        setThemeRef.current = setTheme;
    }, [setTheme]);

    useEffect(() => {
        setThemeRef.current(theme);
    }, [theme]);

    return null;
}
