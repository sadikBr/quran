"use client";

import {
    BookOpen,
    LayoutDashboard,
    LogOut,
    Moon,
    Settings,
    Sun,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
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

export default function UserMenu({
    name,
    image,
    continueReadingHref,
}: {
    name: string;
    image?: string | null;
    continueReadingHref?: string;
}) {
    const { resolvedTheme, setTheme } = useTheme();
    const { setPreferences, ...preferences } = useSettings();
    const [selectedTheme, setSelectedTheme] = useState(preferences.theme);

    async function changeTheme(theme: Theme) {
        const previousTheme = selectedTheme;

        setSelectedTheme(theme);
        setTheme(theme);

        const result = await updatePreferences({ ...preferences, theme });

        if (!result.success) {
            setSelectedTheme(previousTheme);
            setTheme(previousTheme);
            toast.error(result.message);
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
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    setTheme(DEFAULT_PREFERENCES.theme);
                    window.location.assign("/");
                },
            },
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Open account menu"
                >
                    <Avatar className="size-10 border border-primary/20">
                        {image && <AvatarImage src={image} alt="" />}
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {getInitials(name)}
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="flex items-center justify-between gap-3 px-2.5 py-2.5">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {name}
                        </p>
                        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                            Your reading space
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted/65 text-muted-foreground transition-colors hover:bg-primary/12 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
                    >
                        {resolvedTheme === "dark" ? (
                            <Sun aria-hidden="true" className="size-4" />
                        ) : (
                            <Moon aria-hidden="true" className="size-4" />
                        )}
                    </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {continueReadingHref && (
                    <>
                        <DropdownMenuItem
                            asChild
                            className="mt-1 cursor-pointer rounded-md bg-primary px-2.5 py-2 font-semibold text-primary-foreground shadow-sm focus:bg-primary/90 focus:text-primary-foreground"
                        >
                            <Link href={continueReadingHref}>
                                <BookOpen
                                    aria-hidden="true"
                                    className="text-primary-foreground"
                                />
                                Continue reading
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-0.5 opacity-0" />
                    </>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                        <LayoutDashboard aria-hidden="true" />
                        Dashboard
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                        <UserRound aria-hidden="true" />
                        Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <Settings aria-hidden="true" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={signOut}>
                    <LogOut aria-hidden="true" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
