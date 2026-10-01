"use client";

import { useTheme } from "next-themes";
import { authClient } from "@/features/auth/auth-client";
import { clearDevicePushSubscription } from "@/features/notifications/device-subscription";
import { DEFAULT_PREFERENCES } from "@/features/settings/preferences";
import { Button } from "./ui/button";

export default function SignOutButton() {
    const { setTheme } = useTheme();

    const signOut = () => {
        authClient.signOut({
            fetchOptions: {
                onSuccess: async () => {
                    await clearDevicePushSubscription().catch(() => {});
                    setTheme(DEFAULT_PREFERENCES.theme);
                    window.location.assign("/");
                },
            },
        });
    };

    return (
        <Button variant="destructive" onClick={signOut}>
            Sign Out
        </Button>
    );
}
