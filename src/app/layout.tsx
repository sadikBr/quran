import type { Metadata } from "next";
import {
    Amiri,
    Fira_Code,
    IBM_Plex_Sans_Arabic,
    Merriweather,
    Oxanium,
} from "next/font/google";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { Toaster } from "sonner";
import ContentProtection from "@/components/content-protection";
import { ThemeProvider } from "@/components/theme-provider";
import ThemePreferenceSync from "@/features/settings/components/theme-preference-sync";
import getPreferences from "@/features/settings/server/get-preferences";
import { SettingsProvider } from "@/features/settings/settings-provider";
import { getMessages } from "@/i18n/config";
import { cn } from "@/lib/utils";

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

const amiri = Amiri({
    variable: "--font-tafsir",
    subsets: ["arabic"],
    weight: ["400", "700"],
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
    variable: "--font-arabic-ui",
    subsets: ["arabic"],
    weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Common",
    });

    return {
        title: t("metadata.title"),
        description: t("metadata.description"),
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);

    return (
        <html
            lang={preferences.language}
            dir={preferences.language === "ar" ? "rtl" : "ltr"}
            suppressHydrationWarning
        >
            <body
                className={cn(
                    oxanium.variable,
                    firaCode.variable,
                    merriweather.variable,
                    amiri.variable,
                    ibmPlexSansArabic.variable,
                    "antialiased",
                    `quran-font-step-${preferences.arabicTextSize}`,
                    preferences.language === "ar" && "arabic-ui",
                    preferences.riwayah === "warsh" && "riwayah-warsh",
                )}
            >
                <NextIntlClientProvider
                    locale={preferences.language}
                    messages={messages}
                    formats={{}}
                    now={new Date()}
                    timeZone="Africa/Casablanca"
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
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
