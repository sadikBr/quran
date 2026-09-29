"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEMES } from "@/features/settings/preferences";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            themes={[...THEMES]}
            enableColorScheme={false}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
