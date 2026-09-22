import type { Metadata } from "next";
import { Fira_Code, Merriweather, Oxanium } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
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
                        <Toaster />
                        {children}
                    </SettingsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
