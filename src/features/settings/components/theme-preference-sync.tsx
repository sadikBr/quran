"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useSettings } from "../settings-provider";
import { THEME_COLORS } from "../theme-colors";

export default function ThemePreferenceSync() {
    const { theme } = useSettings();
    const { setTheme, resolvedTheme } = useTheme();
    const setThemeRef = useRef(setTheme);

    useEffect(() => {
        setThemeRef.current = setTheme;
    }, [setTheme]);

    useEffect(() => {
        setThemeRef.current(theme);
    }, [theme]);

    useEffect(() => {
        if (!resolvedTheme || !(resolvedTheme in THEME_COLORS)) return;
        const color = THEME_COLORS[resolvedTheme as keyof typeof THEME_COLORS];
        // Update every server-provided entry, including system-theme media entries.
        // Keep their media attributes intact so navigation can reconcile them.
        function syncChromeColor() {
            const metas = document.querySelectorAll<HTMLMetaElement>(
                'meta[name="theme-color"]',
            );
            for (const meta of metas) {
                if (meta.content !== color) meta.content = color;
            }
        }
        syncChromeColor();
        // Next can replace metadata during navigation or a server refresh.
        const observer = new MutationObserver(syncChromeColor);
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["content", "name"],
        });
        return () => observer.disconnect();
    }, [resolvedTheme]);

    return null;
}
