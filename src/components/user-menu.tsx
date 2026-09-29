"use client";

import {
    LoaderCircle,
    LogOut,
    Palette,
    Settings,
    UserRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useIsPlatformAdmin } from "@/features/auth/account-role-provider";
import { authClient } from "@/features/auth/auth-client";
import ThemeSelector from "@/features/settings/components/theme-selector";
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
    const { setTheme } = useTheme();
    const locale = useLocale();
    const commonT = useTranslations("Common");
    const isAdmin = useIsPlatformAdmin();
    const adminT = useTranslations("Admin");
    const { setPreferences, ...preferences } = useSettings();
    const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const avatarRef = useRef<HTMLButtonElement>(null);
    const savingRef = useRef(false);
    const settingsT = useTranslations("Settings");
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function changeTheme(theme: Theme) {
        if (savingRef.current || theme === preferences.theme) return;
        savingRef.current = true;
        const previousTheme = preferences.theme;
        setPendingTheme(theme);
        setTheme(theme);
        try {
            const result = await updatePreferences({ ...preferences, theme });
            if (!result.success) throw new Error("Theme save failed");
            setPreferences((current) => ({ ...current, theme }));
        } catch {
            setTheme(previousTheme);
            toast.error(commonT("feedback.preferencesUpdateFailed"));
        } finally {
            savingRef.current = false;
            setPendingTheme(null);
        }
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
                        ref={avatarRef}
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
                    onCloseAutoFocus={(event) => {
                        if (pickerOpen) event.preventDefault();
                    }}
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
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
                        <Palette aria-hidden="true" />
                        {settingsT("sections.appearance.eyebrow")}
                    </DropdownMenuItem>
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
            <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        lang={locale}
                        onCloseAutoFocus={(event) => {
                            event.preventDefault();
                            avatarRef.current?.focus();
                        }}
                        className={`fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-xl outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(48rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 ${locale === "ar" ? "arabic-ui" : ""}`}
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <Dialog.Title className="text-lg font-semibold">
                                    {settingsT("theme.title")}
                                </Dialog.Title>
                                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                                    {settingsT("theme.quickHint")}
                                </Dialog.Description>
                            </div>
                            <Dialog.Close
                                aria-label={commonT("navigation.close")}
                                className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </Dialog.Close>
                        </div>
                        <ThemeSelector
                            value={pendingTheme ?? preferences.theme}
                            onChange={changeTheme}
                            disabled={pendingTheme !== null}
                        />
                        <output className="mt-3 block min-h-5 text-xs text-muted-foreground">
                            {pendingTheme !== null
                                ? settingsT("footer.saving")
                                : ""}
                        </output>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
