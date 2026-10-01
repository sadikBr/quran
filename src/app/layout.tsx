import type { Metadata, Viewport } from "next";
import {
    Amiri,
    Fira_Code,
    IBM_Plex_Sans_Arabic,
    Merriweather,
    Oxanium,
} from "next/font/google";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Toaster } from "sonner";
import ConnectionStatus from "@/components/connection-status";
import ContentProtection from "@/components/content-protection";
import NavigationFeedback from "@/components/navigation-feedback";
import { ThemeProvider } from "@/components/theme-provider";
import { AccountRoleProvider } from "@/features/auth/account-role-provider";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import PushSubscriptionSync from "@/features/notifications/components/push-subscription-sync";
import OfflineLibraryManager from "@/features/offline/components/offline-library-manager";
import TourRunner from "@/features/onboarding/tour-runner";
import ThemePreferenceSync from "@/features/settings/components/theme-preference-sync";
import getPreferences from "@/features/settings/server/get-preferences";
import { SettingsProvider } from "@/features/settings/settings-provider";
import { THEME_COLORS } from "@/features/settings/theme-colors";
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

export async function generateViewport(): Promise<Viewport> {
    const { theme } = await getPreferences();
    return {
        themeColor:
            theme === "system"
                ? [
                      {
                          media: "(prefers-color-scheme: light)",
                          color: THEME_COLORS.light,
                      },
                      {
                          media: "(prefers-color-scheme: dark)",
                          color: THEME_COLORS.dark,
                      },
                  ]
                : THEME_COLORS[theme],
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth.api.getSession({ headers: await headers() });
    const isAdmin = session ? await isPlatformAdmin(session.user.id) : false;
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Common",
    });

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
                    <AccountRoleProvider
                        isAdmin={isAdmin}
                        isAuthenticated={Boolean(session)}
                    >
                        <ThemeProvider
                            attribute="class"
                            enableSystem
                            defaultTheme={preferences.theme}
                            disableTransitionOnChange
                        >
                            <SettingsProvider preferences={preferences}>
                                <a
                                    href="#main-content"
                                    className="fixed top-3 start-3 z-[100] -translate-y-20 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {t("accessibility.skipToContent")}
                                </a>
                                <ContentProtection />
                                <ConnectionStatus />
                                <OfflineLibraryManager />
                                <PushSubscriptionSync
                                    key={session?.session.id ?? "signed-out"}
                                />
                                <NavigationFeedback />
                                <ThemePreferenceSync />
                                <Toaster
                                    closeButton
                                    dir={
                                        preferences.language === "ar"
                                            ? "rtl"
                                            : "ltr"
                                    }
                                    visibleToasts={3}
                                    offset={{
                                        top: "calc(1rem + env(safe-area-inset-top))",
                                        left: "1rem",
                                        right: "1rem",
                                    }}
                                    mobileOffset={{
                                        top: "calc(0.75rem + env(safe-area-inset-top))",
                                        left: "0.75rem",
                                        right: "0.75rem",
                                    }}
                                    position={
                                        preferences.language === "ar"
                                            ? "top-left"
                                            : "top-right"
                                    }
                                    toastOptions={{
                                        duration: 5000,
                                        unstyled: true,
                                        classNames: {
                                            toast: "font-sans relative flex min-h-16 w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-start text-card-foreground shadow-lg shadow-black/10",
                                            content: "min-w-0 flex-1 pe-8",
                                            icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary [&_svg]:size-4",
                                            title: "font-sans break-words text-sm font-medium leading-6 tracking-normal",
                                            description:
                                                "mt-1 break-words font-sans text-xs leading-6 text-muted-foreground",
                                            closeButton:
                                                "absolute top-1/2 end-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg border-0! bg-transparent! text-muted-foreground! shadow-none! transition-colors hover:bg-muted! hover:text-foreground! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
                                            success:
                                                "border-s-2 border-s-emerald-500/70 [&_[data-icon]]:bg-emerald-500/10 [&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400",
                                            error: "border-s-2 border-s-destructive [&_[data-icon]]:bg-destructive/10 [&_[data-icon]]:text-destructive",
                                            warning:
                                                "border-s-2 border-s-amber-500 [&_[data-icon]]:bg-amber-500/10 [&_[data-icon]]:text-amber-600",
                                            info: "border-s-2 border-s-primary",
                                            actionButton:
                                                "min-h-11 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground",
                                            cancelButton:
                                                "min-h-11 shrink-0 rounded-lg bg-muted px-3 text-xs font-medium text-muted-foreground",
                                        },
                                    }}
                                />
                                <div id="main-content" tabIndex={-1}>
                                    {children}
                                    {session && (
                                        <Suspense fallback={null}>
                                            <TourRunner />
                                        </Suspense>
                                    )}
                                </div>
                            </SettingsProvider>
                        </ThemeProvider>
                    </AccountRoleProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
