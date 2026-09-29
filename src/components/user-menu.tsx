"use client";

import {
    LoaderCircle,
    LogOut,
    Moon,
    Settings,
    Sun,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { useIsPlatformAdmin } from "@/features/auth/account-role-provider";
import { authClient } from "@/features/auth/auth-client";
import {
    DEFAULT_PREFERENCES,
    type Theme,
} from "@/features/settings/preferences";
import updatePreferences from "@/features/settings/server/update-preferences";
import { useSettings } from "@/features/settings/settings-provider";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function getInitials(name: string) {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("");

    return initials.toUpperCase() || "U";
}

export interface UserMenuLabels {
    openMenu: string;
    readingSpace: string;
    switchToLight: string;
    switchToDark: string;
    continueReading: string;
    dashboard: string;
    profile: string;
    settings: string;
    signOut: string;
}

const DEFAULT_LABELS: UserMenuLabels = {
    openMenu: "Open account menu",
    readingSpace: "Your reading space",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    continueReading: "Continue reading",
    dashboard: "Dashboard",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign out",
};

export default function UserMenu({
    name,
    image,
    labels = DEFAULT_LABELS,
}: {
    name: string;
    image?: string | null;
    continueReadingHref?: string;
    labels?: UserMenuLabels;
}) {
    const { resolvedTheme, setTheme } = useTheme();
    const locale = useLocale();
    const commonT = useTranslations("Common");
    const isAdmin = useIsPlatformAdmin();
    const adminT = useTranslations("Admin");
    const { setPreferences, ...preferences } = useSettings();
    const [selectedTheme, setSelectedTheme] = useState(preferences.theme);
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function changeTheme(theme: Theme) {
        const previousTheme = selectedTheme;

        setSelectedTheme(theme);
        setTheme(theme);

        const result = await updatePreferences({ ...preferences, theme });

        if (!result.success) {
            setSelectedTheme(previousTheme);
            setTheme(previousTheme);
            toast.error(commonT("feedback.preferencesUpdateFailed"));
            return;
        }

        setPreferences((currentPreferences) => ({
            ...currentPreferences,
            theme,
        }));
    }

    function toggleTheme() {
        changeTheme(resolvedTheme === "dark" ? "light" : "dark");
    }

    function signOut() {
        if (isSigningOut) return;
        setIsSigningOut(true);
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    setTheme(DEFAULT_PREFERENCES.theme);
                    window.location.assign("/");
                },
                onError: () => {
                    setIsSigningOut(false);
                    toast.error(commonT("feedback.signOutFailed"));
                },
            },
        });
    }

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            <DropdownMenu dir={locale === "ar" ? "rtl" : "ltr"}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={labels.openMenu}
                    >
                        <Avatar className="size-10 border border-primary/20">
                            {image && <AvatarImage src={image} alt="" />}
                            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-[min(16rem,calc(100vw-1rem))] p-1.5"
                >
                    <DropdownMenuLabel className="flex items-center justify-between gap-3 px-2.5 py-2.5">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {name}
                            </p>
                            <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                                {isAdmin
                                    ? adminT("account")
                                    : labels.readingSpace}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted/65 text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={
                                resolvedTheme === "dark"
                                    ? labels.switchToLight
                                    : labels.switchToDark
                            }
                        >
                            {resolvedTheme === "dark" ? (
                                <Sun aria-hidden="true" className="size-4" />
                            ) : (
                                <Moon aria-hidden="true" className="size-4" />
                            )}
                        </button>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/profile">
                            <UserRound aria-hidden="true" />
                            {labels.profile}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <Settings aria-hidden="true" />
                            {labels.settings}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        disabled={isSigningOut}
                        onSelect={signOut}
                    >
                        {isSigningOut ? (
                            <LoaderCircle
                                aria-hidden="true"
                                className="animate-spin"
                            />
                        ) : (
                            <LogOut aria-hidden="true" />
                        )}
                        {labels.signOut}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
