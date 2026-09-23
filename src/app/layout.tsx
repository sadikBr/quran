import type { Metadata } from "next";
import { Fira_Code, Merriweather, Oxanium } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ContentProtection from "@/components/content-protection";
import { ThemeProvider } from "@/components/theme-provider";
import ThemePreferenceSync from "@/features/settings/components/theme-preference-sync";
import getPreferences from "@/features/settings/server/get-preferences";
import { SettingsProvider } from "@/features/settings/settings-provider";

const oxanium = Oxanium({
    variable: "--font-sans",
    subsets: ["latin"],
});

const firaCode = Fira_Code({
    variable: "--font-mono",
    subsets: ["latin"],
});

const merriweather = Merriweather({
    variable: "--font-serif",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Read Quran & Track Your Memorization",
    description: "App to read Quran and track your memorization",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const preferences = await getPreferences();

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${oxanium.variable} ${firaCode.variable} ${merriweather.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    enableSystem
                    defaultTheme={preferences.theme}
                    disableTransitionOnChange
                >
                    <SettingsProvider preferences={preferences}>
                        <ContentProtection />
                        <ThemePreferenceSync />
                        <Toaster
                            closeButton
                            position="top-right"
                            toastOptions={{
                                duration: 5000,
                                unstyled: true,
                                classNames: {
                                    toast: "font-sans relative flex w-full items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-card-foreground shadow-lg",
                                    content: "min-w-0 flex-1 pr-5",
                                    title: "font-sans text-sm font-semibold tracking-normal",
                                    description:
                                        "mt-1 font-sans text-sm leading-5 text-muted-foreground",
                                    closeButton:
                                        "absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                                    error: "border-destructive/30",
                                },
                            }}
                        />
                        {children}
                    </SettingsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
