"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEMES } from "@/features/settings/preferences";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            key={THEMES.join(":")}
            themes={[...THEMES]}
            enableColorScheme={false}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
