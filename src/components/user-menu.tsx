"use client";

import { LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { authClient } from "@/features/auth/auth-client";
import { DEFAULT_PREFERENCES } from "@/features/settings/preferences";
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
}: {
    name: string;
    image?: string | null;
}) {
    const { setTheme } = useTheme();

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
                <DropdownMenuLabel className="px-2.5 py-2.5">
                    <p className="text-sm font-semibold text-foreground">
                        {name}
                    </p>
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                        Your reading space
                    </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
